import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent 
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove } from '@dnd-kit/sortable';
import Icons from './assets/icons.ts';
import type { Template, Group } from '../types/index';
import * as s from '../utils/storage.ts';
import TemplateModal from './components/EntryEditor.tsx';
import GroupItem from './components/GroupPanel.tsx';
import DragHandle from './ui/DragHandle.tsx';
import DropGap from './ui/DropGap.tsx';
import './styles.css';

const Options: React.FC = () => {
  // データ管理
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // UI状態
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [addingToGroupId, setAddingToGroupId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  // テンプレートのドラッグ状態
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [activeTemplateGapId, setActiveTemplateGapId] = useState<string | null>(null);

  // グループのドラッグ状態
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [activeGroupGapId, setActiveGroupGapId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const loadData = useCallback(async () => {
    const data = await s.loadStoredData();
    setGroups([...data.groups].sort((a, b) => a.order - b.order));
    setTemplates(data.templates);
    // 初期ロード時は全て展開
    setExpandedGroups(new Set(data.groups.map((g) => g.id)));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  //* ドラッグ開始処理
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const idStr = String(active.id);
    
    if (idStr.startsWith('template-')) {
      const templateId = parseInt(idStr.replace('template-', ''), 10);
      setActiveTemplateId(templateId);
      setActiveGroupId(null);
    }
    
    if (idStr.startsWith('group-')) {
      const groupId = parseInt(idStr.replace('group-', ''), 10);
      setActiveGroupId(groupId);
      setActiveTemplateId(null);
      // ドラッグ中は一時的にグループを閉じる
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  };

  //* ドラッグオーバー処理
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over, delta } = event;

    if (!over) {
      setActiveTemplateGapId(null);
      return;
    }

    const overId = String(over.id);
    const isAfter = delta.y > 0;
    const position: 'before' | 'after' = isAfter ? 'after' : 'before';

    //* グループをドラッグ中の場合
    if (String(active.id).startsWith('group-')) {
      // group-gap への直接ホバー
      if (overId.startsWith('group-gap-')) {
        setActiveGroupGapId(overId);
        return;
      }
      
      // グループ要素にホバーした場合の処理（ここでは無視またはフォールバック）
      setActiveGroupGapId(null); 
      return;
    }

    //* テンプレートをドラッグ中の場合
    
    // gapに直接ホバーした場合
    if (overId.startsWith('gap-')) {
      setActiveTemplateGapId(overId);
      return;
    }

    // gap以外の要素からgapを推測
    let targetGapId: string | null = null;

    if (overId.startsWith('template-')) {
      const tid = Number(overId.replace('template-', ''));
      if (overId !== String(active.id)) {
        const overTemplate = templates.find(t => t.id === tid);
        if (overTemplate) {
          const groupTemplates = templates
            .filter(t => t.groupId === overTemplate.groupId)
            .sort((a, b) => a.order - b.order);
          const index = groupTemplates.findIndex(t => t.id === tid);
          // ドラッグ方向でgapのインデックスを決定
          const gapIndex = position === 'after' ? index + 1 : index;
          targetGapId = `gap-${overTemplate.groupId}-${gapIndex}`;
        }
      }
    }
    
    setActiveTemplateGapId(targetGapId);
  };

  //* ドラッグ終了処理 (グループとテンプレートの振り分け)
  const handleDragEndMain = (event: DragEndEvent) => {
    const activeIdStr = String(event.active.id);

    if (activeIdStr.startsWith('group-')) {
      handleGroupDragEnd(event);
    } else if (activeIdStr.startsWith('template-')) {
      handleTemplateDragEnd(event);
    }
  };

  //* グループのドラッグ終了処理
  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = parseInt(String(active.id).replace('group-', ''), 10);
    
    // 状態リセット（これによりDragOverlayのアニメーションが開始される）
    setActiveGroupId(null);
    setActiveGroupGapId(null);

    if (!over) {
      // ドロップ失敗時もアニメーション完了を待ってから展開
      await new Promise(resolve => setTimeout(resolve, 200));
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add(activeId);
        return next;
      });
      return;
    }
    
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (!activeIdStr.startsWith('group-') || !overIdStr.startsWith('group-gap-')) {
      // 無効なドロップでもアニメーション完了を待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add(activeId);
        return next;
      });
      return;
    }

    // gap-IDからターゲットインデックスを抽出
    const targetIndex = parseInt(overIdStr.replace('group-gap-', ''), 10);
    if (isNaN(targetIndex)) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add(activeId);
        return next;
      });
      return;
    }

    const activeGroupId = parseInt(activeIdStr.replace('group-', ''), 10);
    
    const oldIndex = groups.findIndex(g => g.id === activeGroupId);
    let newIndex = targetIndex; 

    if (oldIndex < 0 || oldIndex === newIndex) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add(activeId);
        return next;
      });
      return;
    }
    
    // arrayMoveの挙動に合わせて、挿入位置の調整
    const insertIndex = oldIndex < newIndex ? newIndex - 1 : newIndex;
    
    const newOrder = arrayMove(groups, oldIndex, insertIndex);

    setGroups(newOrder.map((g, i) => ({ ...g, order: i })));
    
    // アニメーション完了を待ってからデータ永続化とグループ展開
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await s.reorderGroups(newOrder.map(g => g.id));
    await loadData();
    
    // データロード完了後にグループを展開
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.add(activeId);
      return next;
    });
  };
  //* テンプレートのドラッグ終了処理
  const handleTemplateDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTemplateId(null);
    setActiveTemplateGapId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    if (!activeIdStr.startsWith('template-')) return;
    
    // 最終的なドロップターゲットは activeGapId に保持されているはず
    const finalGapId = activeTemplateGapId;

    if (!finalGapId || !finalGapId.startsWith('gap-')) return;

    const activeTemplateId = parseInt(activeIdStr.replace('template-', ''), 10);
    const activeTemplate = templates.find((t) => t.id === activeTemplateId);
    if (!activeTemplate) return;

    // gap IDからグループIDとインデックスを抽出
    const parts = finalGapId.split('-');
    if (parts.length !== 3) return;

    const targetGroupId = parseInt(parts[1], 10);
    const targetIndex = parseInt(parts[2], 10);

    if (isNaN(targetGroupId) || isNaN(targetIndex)) return;

    const isCrossGroup = activeTemplate.groupId !== targetGroupId;

    if (isCrossGroup) {
      setTemplates((prev) => {
        const moved = {
          ...activeTemplate,
          groupId: targetGroupId,
          order: targetIndex,
        };

        const filtered = prev.filter(t => t.id !== activeTemplateId);

        const targetGroupTemplates = filtered
          .filter(t => t.groupId === targetGroupId)
          .sort((a, b) => a.order - b.order);

        targetGroupTemplates.splice(targetIndex, 0, moved);

        const updatedTarget = targetGroupTemplates.map((t, i) => ({
          ...t,
          order: i,
        }));

        const others = filtered.filter(t => t.groupId !== targetGroupId);

        return [...others, ...updatedTarget];
      });
      // グループ間での移動 (永続化を伴う)
      await s.moveTemplateToGroup(activeTemplateId, targetGroupId, targetIndex);
      await loadData();
    } else {
      // 同じグループ内での移動 (ソートロジック)
      const groupTemplates = templates
        .filter((t) => t.groupId === targetGroupId)
        .sort((a, b) => a.order - b.order);

      const oldIndex = groupTemplates.findIndex((t) => t.id === activeTemplateId);
      
      // arrayMoveの挙動に合わせて挿入位置を調整
      let newIndex = targetIndex;
      if (oldIndex < targetIndex) {
        newIndex = targetIndex - 1;
      }

      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(groupTemplates, oldIndex, newIndex);
        
        setTemplates((prev) => {
          const others = prev.filter(t => t.groupId !== targetGroupId);
          return [
            ...others,
            ...newOrder.map((t, i) => ({ ...t, order: i })),
          ];
        });
        
        // 永続化
        await s.reorderTemplates(
          targetGroupId,
          newOrder.map((t) => t.id)
        );
        await loadData();
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTemplateId(null);
    setActiveTemplateGapId(null);
    setActiveGroupId(null);
    setActiveGroupGapId(null);
  };

  const activeTemplate = activeTemplateId
    ? templates.find((t) => t.id === activeTemplateId)
    : null;
  
  const activeGroup = activeGroupId
    ? groups.find((g) => g.id === activeGroupId)
    : null;

  const handleAddGroup = async () => {
    const newGroupId = await s.addGroup({ name: '新しいグループ' });
    await loadData();
    setEditingGroupId(newGroupId);
  };

  const handleDeleteGroup = async (id: number) => {
    if (confirm('このグループとすべてのテンプレートを削除しますか？')) {
      await s.deleteGroup(id);
      await loadData();
    }
  };

  const handleGroupNameChange = async (id: number, name: string) => {
    await s.updateGroup(id, { name });
    await loadData();
  };

  const handleToggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleAddTemplate = (groupId: number) => {
    setAddingToGroupId(groupId);
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setAddingToGroupId(null);
    setIsModalOpen(true);
  };

  const handleDeleteTemplate = async (id: number) => {
    if (confirm('このテンプレートを削除しますか？')) {
      await s.deleteTemplate(id);
      await loadData();
    }
  };

  const handleTemplateNameChange = async (id: number, name: string) => {
    await s.updateTemplate(id, { name });
    await loadData();
  };

  const handleSaveTemplate = async (
    templateData: Partial<Template> & { groupId: number }
  ) => {
    if (templateData.id) {
      await s.updateTemplate(templateData.id, {
        name: templateData.name,
        content: templateData.content,
      });
    } else {
      await s.addTemplate({
        groupId: templateData.groupId,
        name: templateData.name || '',
        content: templateData.content || '',
      });
    }
    setIsModalOpen(false);
    setEditingTemplate(null);
    setAddingToGroupId(null);
    await loadData();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setAddingToGroupId(null);
  };

  const getTemplatesForGroup = (groupId: number) =>
    templates.filter((t) => t.groupId === groupId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEndMain}
      onDragCancel={handleDragCancel}
    >
      <div className="options-container">
        {/* ================= Header ================= */}
        <header className="options-header">
          <h1>PromptTemplate</h1>
        </header>

        {/* ========== Group Area (Main UI) ========== */}
        {/* 点線で囲むためのコンテナ */}
        <div className="group-area-container">
          
          {/* グループ追加ボタン */}
          <div className="group-actions-header">
            <button className="add-group-btn" onClick={handleAddGroup}>
              <Icons.PlaylistAdd />
              グループを追加
            </button>
          </div>

          {/* ===== Empty State ===== */}
          {groups.length === 0 ? (
            <div className="empty-state">
              <p>まだグループがありません</p>
              <p>「追加」ボタンをクリックして開始しましょう</p>
            </div>
          ) : (
            /* ===== Groups ===== */
            <div className="groups-container">
              {groups.map((group, idx) => (
                <React.Fragment key={group.id}>
                  {/* グループ間のドロップギャップ */}
                  <DropGap
                    type="group"
                    indexOrId={idx}
                    isActive={activeGroupGapId === `group-gap-${idx}`}
                    isDraggingGroup={activeGroupId !== null}
                  />
                  
                  {/* グループパネル本体 */}
                  <GroupItem
                    group={group}
                    templates={getTemplatesForGroup(group.id)}
                    isExpanded={expandedGroups.has(group.id)}
                    onToggle={() => handleToggleGroup(group.id)}
                    onEdit={handleEditTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    onTemplateNameChange={handleTemplateNameChange}
                    onGroupNameChange={handleGroupNameChange}
                    onDeleteGroup={handleDeleteGroup}
                    onAddTemplate={handleAddTemplate}
                    startEditing={editingGroupId === group.id}
                    onEditingComplete={() => setEditingGroupId(null)}
                    activeTemplateId={activeTemplateId}
                    activeGapId={activeTemplateGapId}
                    groupDraggableId={`group-${group.id}`}
                    isGroupDragging={activeGroupId === group.id}
                  />
                </React.Fragment>
              ))}
              {/* 最後の gap */}
              <DropGap
                type="group"
                indexOrId={groups.length}
                isActive={activeGroupGapId === `group-gap-${groups.length}`}
                isDraggingGroup={activeGroupId !== null}
              />
            </div>
          )}
        </div>

        {/* ========== Template Modal ========== */}
        {isModalOpen && (
          <TemplateModal
            template={editingTemplate}
            groupId={addingToGroupId}
            onSave={handleSaveTemplate}
            onClose={handleCloseModal}
          />
        )}

        {/* ========== Drag Overlay ========== */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {activeTemplate && (
            <div className="template-item drag-overlay">
              <DragHandle />
              <span className="template-name">{activeTemplate.name}</span>
              <div className="template-actions">
                <button className="icon-btn">
                  <Icons.Edit />
                </button>
                <button className="icon-btn delete">
                  <Icons.Delete />
                </button>
              </div>
            </div>
          )}

          {activeGroup && (
            <div className="group-item dragging-overlay">
              <div className="group-header">
                <button className="expand-btn">
                  <Icons.ExpandMore />
                </button>
                <span className="group-name">{activeGroup.name}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default Options;