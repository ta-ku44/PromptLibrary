import { useState } from 'react';
import { useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Template, Category } from '../../types/index';

const OTHER_CATEGORY_ID = -1; // Otherカテゴリのid

interface UseDragAndDropProps {
  categories: Category[];
  templates: Template[];
  expandedCategories: Set<number>;
  setExpandedCategories: React.Dispatch<React.SetStateAction<Set<number>>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
  reorderCategories: (categoryIds: number[]) => Promise<void>;
  moveTemplateToCategory: (templateId: number, targetCategoryId: number | null, targetIndex: number) => Promise<void>;
  reorderTemplates: (categoryId: number | null, templateIds: number[]) => Promise<void>;
}

export const useDragAndDrop = ({
  categories,
  templates,
  expandedCategories,
  setExpandedCategories,
  setCategories,
  setTemplates,
  reorderCategories,
  moveTemplateToCategory,
  reorderTemplates,
}: UseDragAndDropProps) => {
  // テンプレートのドラッグ状態
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [activeTemplateGapId, setActiveTemplateGapId] = useState<string | null>(null);

  // カテゴリのドラッグ状態
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeGroupGapId, setActiveGroupGapId] = useState<string | null>(null);
  const [wasGroupExpandedBeforeDrag, setWasGroupExpandedBeforeDrag] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const idStr = String(active.id);
    const categoriesList = categories.map((c, idx) => `Category(id=${c.id}, idx=${idx})`).join(', ');
    console.log(`[handleDragStart] Dragging: ${idStr} | Categories: ${categoriesList}`);

    if (idStr.startsWith('template-')) {
      const templateId = parseInt(idStr.replace('template-', ''), 10);
      setActiveTemplateId(templateId);
      setActiveCategoryId(null);
    }

    if (idStr.startsWith('category-')) {
      const categoryId = parseInt(idStr.replace('category-', ''), 10);

      // Otherカテゴリはドラッグ不可
      if (categoryId === OTHER_CATEGORY_ID) {
        return;
      }

      setActiveCategoryId(categoryId);
      setActiveTemplateId(null);

      // カテゴリ展開状態を保存し、ドラッグ中は折りたたむ
      const wasExpanded = expandedCategories.has(categoryId);
      setWasGroupExpandedBeforeDrag(wasExpanded);
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over, activatorEvent } = event;

    if (!over) {
      setActiveTemplateGapId(null);
      setActiveGroupGapId(null);
      return;
    }

    const activeIdStr = String(active.id);
    const overId = String(over.id);

    const deltaY = (activatorEvent as any)?.deltaY ?? 0;
    const clientY = (activatorEvent as any)?.clientY ?? 0;

    // カテゴリドラッグ時のみログを出力
    if (activeIdStr.startsWith('category-')) {
      const gapIndex = overId.startsWith('category-gap-') ? overId.replace('category-gap-', '') : 'none';
      console.log(`[handleDragOver] Y:${clientY.toFixed(1)} Delta:${deltaY.toFixed(1)} Over:${overId} Gap:${gapIndex}`);
    }

    // カテゴリドラッグ時の処理
    if (activeIdStr.startsWith('category-')) {
      if (overId.startsWith('category-gap-')) {
        const categoriesList = categories.map((c, idx) => `Category(id=${c.id}, idx=${idx})`).join(', ');
        console.log(`[handleDragOver] ✓ Category gap detected: ${overId} | Categories: ${categoriesList}`);
        setActiveGroupGapId(overId);
      } else {
        setActiveGroupGapId(null);
      }
      return;
    }

    // テンプレートドラッグ時の処理
    if (activeIdStr.startsWith('template-')) {
      // ギャップに直接ホバーした場合
      if (overId.startsWith('gap_')) {
        setActiveTemplateGapId(overId);
        return;
      }

      // テンプレート要素にホバーした場合：要素の中心を基準に前後を判定
      if (overId.startsWith('template-')) {
        const tid = Number(overId.replace('template-', ''));

        // 自分自身の上にホバーしている場合は何もしない
        if (overId === activeIdStr) {
          setActiveTemplateGapId(null);
          return;
        }

        const overTemplate = templates.find((t) => t.id === tid);

        if (overTemplate && activatorEvent && 'clientY' in activatorEvent) {
          // DOM要素から位置情報を取得
          const overElement = document.querySelector(`[data-template-id="${tid}"]`);

          if (overElement) {
            const rect = overElement.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            const pointerY = (activatorEvent as MouseEvent).clientY;

            // ポインターが要素の中心より下なら'after'、上なら'before'
            const position = pointerY > centerY ? 'after' : 'before';

            // 同じカテゴリ内のテンプレート一覧を取得（categoryId: null の場合は OTHER_CATEGORY_ID で管理）
            const overCategoryId = overTemplate.categoryId ?? OTHER_CATEGORY_ID;
            const categoryTemplates = templates
              .filter((t) => (t.categoryId ?? OTHER_CATEGORY_ID) === overCategoryId)
              .sort((a, b) => a.order - b.order);

            const index = categoryTemplates.findIndex((t) => t.id === tid);

            // before なら要素の前のギャップ、after なら要素の後のギャップ
            const gapIndex = position === 'after' ? index + 1 : index;
            const newGapId = `gap_${overCategoryId}_${gapIndex}`;
            setActiveTemplateGapId(newGapId);
          }
        }
        return;
      }

      // その他の場合はギャップをクリア
      setActiveTemplateGapId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeIdStr = String(event.active.id);

    if (activeIdStr.startsWith('category-')) {
      await handleGroupDragEnd(event);
    } else if (activeIdStr.startsWith('template-')) {
      await handleTemplateDragEnd(event);
    }
  };

  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = parseInt(String(active.id).replace('category-', ''), 10);

    setActiveCategoryId(null);
    setActiveGroupGapId(null);

    // ドロップ先がない場合：元の展開状態を復元
    if (!over) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (wasGroupExpandedBeforeDrag) {
        setExpandedCategories((prev) => {
          const next = new Set(prev);
          next.add(activeId);
          return next;
        });
      }
      setWasGroupExpandedBeforeDrag(false);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // カテゴリギャップ以外にドロップした場合：元の展開状態を復元
    if (!activeIdStr.startsWith('category-') || !overIdStr.startsWith('category-gap-')) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (wasGroupExpandedBeforeDrag) {
        setExpandedCategories((prev) => {
          const next = new Set(prev);
          next.add(activeId);
          return next;
        });
      }
      setWasGroupExpandedBeforeDrag(false);
      return;
    }

    // targetIndexは「category-gap-N」のN（ギャップ番号）
    const targetIndex = parseInt(overIdStr.replace('category-gap-', ''), 10);

    if (isNaN(targetIndex)) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (wasGroupExpandedBeforeDrag) {
        setExpandedCategories((prev) => {
          const next = new Set(prev);
          next.add(activeId);
          return next;
        });
      }
      setWasGroupExpandedBeforeDrag(false);
      return;
    }

    const activeCategoryId = parseInt(activeIdStr.replace('category-', ''), 10);
    const oldIndex = categories.findIndex((c) => c.id === activeCategoryId);

    // 移動がない場合：元の展開状態を復元
    if (oldIndex < 0 || oldIndex === targetIndex) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (wasGroupExpandedBeforeDrag) {
        setExpandedCategories((prev) => {
          const next = new Set(prev);
          next.add(activeId);
          return next;
        });
      }
      setWasGroupExpandedBeforeDrag(false);
      return;
    }

    // カテゴリはドラッグ中に元の位置が詰められるため、後方へ移動する場合は削除前インデックス基準の
    // arrayMove に合わせて targetIndex を 1 減らして補正する必要がある。
    const insertIndex = oldIndex < targetIndex ? targetIndex - 1 : targetIndex;
    const newOrder = arrayMove(categories, oldIndex, insertIndex);

    setCategories(newOrder.map((c, i) => ({ ...c, order: i })));

    await new Promise((resolve) => setTimeout(resolve, 200));

    await reorderCategories(newOrder.map((g) => g.id));

    // 元の展開状態を復元
    if (wasGroupExpandedBeforeDrag) {
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.add(activeId);
        return next;
      });
    }
    setWasGroupExpandedBeforeDrag(false);
  };

  const handleTemplateDragEnd = async (event: DragEndEvent) => {
    const { active } = event;

    setActiveTemplateId(null);

    const finalGapId = activeTemplateGapId;
    setActiveTemplateGapId(null);

    if (!finalGapId || !finalGapId.startsWith('gap_')) return;

    const activeIdStr = String(active.id);
    if (!activeIdStr.startsWith('template-')) return;

    const activeTemplateId = parseInt(activeIdStr.replace('template-', ''), 10);
    const activeTemplate = templates.find((t) => t.id === activeTemplateId);
    if (!activeTemplate) return;

    // finalGapIdは「gap_{categoryId}_{index}」形式
    const parts = finalGapId.split('_');
    if (parts.length !== 3) return;

    const targetCategoryIdStr = parts[1];
    const targetIndex = parseInt(parts[2], 10);

    if (isNaN(targetIndex)) return;

    // targetCategoryId は OTHER_CATEGORY_ID の場合 null に変換
    const targetCategoryId =
      targetCategoryIdStr === String(OTHER_CATEGORY_ID) ? null : parseInt(targetCategoryIdStr, 10);
    if (targetCategoryId !== null && isNaN(targetCategoryId)) return;

    const activeCategoryId = activeTemplate.categoryId ?? OTHER_CATEGORY_ID;
    const targetCategoryIdForComparison = targetCategoryId ?? OTHER_CATEGORY_ID;
    const isCrossCategory = activeCategoryId !== targetCategoryIdForComparison;

    // 別カテゴリへの移動
    if (isCrossCategory) {
      setTemplates((prev) => {
        const moved = {
          ...activeTemplate,
          categoryId: targetCategoryId,
          order: targetIndex,
        };

        const filtered = prev.filter((t) => t.id !== activeTemplateId);
        const targetCategoryTemplates = filtered
          .filter((t) => (t.categoryId ?? OTHER_CATEGORY_ID) === targetCategoryIdForComparison)
          .sort((a, b) => a.order - b.order);

        targetCategoryTemplates.splice(targetIndex, 0, moved);

        const updatedTarget = targetCategoryTemplates.map((t, i) => ({
          ...t,
          order: i,
        }));

        const others = filtered.filter((t) => (t.categoryId ?? OTHER_CATEGORY_ID) !== targetCategoryIdForComparison);
        return [...others, ...updatedTarget];
      });

      await moveTemplateToCategory(activeTemplateId, targetCategoryId, targetIndex);
    } else {
      // 同じカテゴリ内での並び替え
      const categoryTemplates = templates
        .filter((t) => (t.categoryId ?? OTHER_CATEGORY_ID) === targetCategoryIdForComparison)
        .sort((a, b) => a.order - b.order);

      const oldIndex = categoryTemplates.findIndex((t) => t.id === activeTemplateId);

      // ドラッグ中は要素が元の位置に残るため、後方へ移動する場合は「ドラッグ中の配列基準」の targetIndex を 1 減らして補正し、
      // その値を newIndex として並び替える必要がある。
      const newIndex = oldIndex < targetIndex ? targetIndex - 1 : targetIndex;

      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(categoryTemplates, oldIndex, newIndex);

        setTemplates((prev) => {
          const others = prev.filter((t) => (t.categoryId ?? OTHER_CATEGORY_ID) !== targetCategoryIdForComparison);
          return [...others, ...newOrder.map((t, i) => ({ ...t, order: i }))];
        });

        await reorderTemplates(
          targetCategoryId,
          newOrder.map((t) => t.id),
        );
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTemplateId(null);
    setActiveTemplateGapId(null);
    setActiveCategoryId(null);
    setActiveGroupGapId(null);
  };

  const activeTemplate = activeTemplateId ? templates.find((t) => t.id === activeTemplateId) : null;

  const activeCategory = activeCategoryId ? categories.find((c) => c.id === activeCategoryId) : null;

  return {
    sensors,
    activeTemplateId,
    activeTemplateGapId,
    activeCategoryId,
    activeGroupGapId,
    activeTemplate,
    activeCategory,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
};
