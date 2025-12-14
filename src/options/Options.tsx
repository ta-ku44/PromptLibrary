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

  // グループのドラッグ状態
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null); // ドラッグ中のグループID
  const [overGroupId, setOverGroupId] = useState<number | null>(null); // ホバー中のグループID
  const [groupDropPosition, setGroupDropPosition] = useState<'before' | 'after'>('before'); // ドロップ位置

  // テンプレートのドラッグ状態
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null); // ドラッグ中のテンプレートID
  const [overTemplateId, setOverTemplateId] = useState<number | null>(null); // ホバー中のテンプレートID
  const [overHeaderGroupId, setOverHeaderGroupId] = useState<number | null>(null); // ホバー中のグループヘッダーID
  const [overAddBtnGroupId, setOverAddBtnGroupId] = useState<number | null>(null); // ホバー中の追加ボタンのグループID
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before'); // ドロップ位置

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const loadData = useCallback(async () => {
    const data = await s.loadStoredData();
    setGroups([...data.groups].sort((a, b) => a.order - b.order));
    setTemplates(data.templates);
    setExpandedGroups(new Set(data.groups.map((g) => g.id)));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  //* ドラッグ開始処理
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const idStr = String(active.id);
    // テンプレートのドラッグ開始
    if (idStr.startsWith('template-')) {
      const templateId = parseInt(idStr.replace('template-', ''), 10);
      setActiveTemplateId(templateId);
      setActiveGroupId(null);
    }
    // グループのドラッグ開始
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
      setOverTemplateId(null);
      setOverHeaderGroupId(null);
      setOverAddBtnGroupId(null);
      setOverGroupId(null);
      return;
    }

    const overId = String(over.id);
    const isAfter = delta.y > 0;
    const position: 'before' | 'after' = isAfter ? 'after' : 'before';

    // ===== グループドラッグ =====
    if (String(active.id).startsWith('group-')) {
      if (overId.startsWith('group-')) {
        setOverGroupId(Number(overId.replace('group-', '')));
        setGroupDropPosition(position);
      } else {
        setOverGroupId(null);
      }
      return;
    }

    // ===== テンプレートドラッグ =====
    setDropPosition(position); // ★ どこにいても必ず更新

    if (overId.startsWith('template-')) {
      const tid = Number(overId.replace('template-', ''));
      if (overId === String(active.id)) {
        setOverTemplateId(null);
        return;
      }
      setOverTemplateId(tid);
      setOverHeaderGroupId(null);
      setOverAddBtnGroupId(null);
      return;
    }

    if (overId.startsWith('group-header-')) {
      setOverHeaderGroupId(Number(overId.replace('group-header-', '')));
      setOverTemplateId(null);
      setOverAddBtnGroupId(null);
      return;
    }

    if (overId.startsWith('group-add-btn-')) {
      setOverAddBtnGroupId(Number(overId.replace('group-add-btn-', '')));
      setOverTemplateId(null);
      setOverHeaderGroupId(null);
      return;
    }

    setOverTemplateId(null);
    setOverHeaderGroupId(null);
    setOverAddBtnGroupId(null);
  };

  //* グループのドラッグ終了処理
  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGroupId(null);
    setOverGroupId(null);
    setGroupDropPosition('before');
    
    // ドラッグ後にグループを再展開
    const activeId = parseInt(String(active.id).replace('group-', ''), 10);
    setExpandedGroups(prev => {
        const next = new Set(prev);
        next.add(activeId);
        return next;
    });

    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (!activeIdStr.startsWith('group-') || !overIdStr.startsWith('group-')) return;
    
    const activeGroupId = parseInt(activeIdStr.replace('group-', ''), 10);
    const overGroupId = parseInt(overIdStr.replace('group-', ''), 10);
    if (activeGroupId === overGroupId) return;

    const oldIndex = groups.findIndex(g => g.id === activeGroupId);
    let newIndex = groups.findIndex(g => g.id === overGroupId);
    
    // dropPositionが'after'の場合は次の位置に挿入
    if (groupDropPosition === 'after') {
      newIndex++;
    }

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    
    // 要素削除による位置ずれを考慮した挿入位置の計算
    const insertIndex = oldIndex < newIndex ? newIndex - 1 : newIndex;
    
    const newOrder = [...groups];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(insertIndex, 0, moved);

    setGroups(newOrder.map((g, i) => ({ ...g, order: i })));
    
    await s.reorderGroups(newOrder.map(g => g.id));
    await loadData();
  };

  //* テンプレートのドラッグ終了処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTemplateId(null);
    setOverTemplateId(null);
    setOverHeaderGroupId(null);
    setOverAddBtnGroupId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (!activeIdStr.startsWith('template-')) return;

    const activeTemplateId = parseInt(activeIdStr.replace('template-', ''), 10);
    const activeTemplate = templates.find((t) => t.id === activeTemplateId);
    if (!activeTemplate) return;

    // テンプレート上にドロップした場合
    if (overIdStr.startsWith('template-')) {
      const overTemplateId = parseInt(overIdStr.replace('template-', ''), 10);
      if (activeTemplateId === overTemplateId) return;

      const overTemplate = templates.find((t) => t.id === overTemplateId);
      if (!overTemplate) return;

      const sourceGroupId = activeTemplate.groupId;
      const targetGroupId = overTemplate.groupId;

      // 同じグループ内での移動
      if (sourceGroupId === targetGroupId) {
        const groupTemplates = templates
          .filter((t) => t.groupId === sourceGroupId)
          .sort((a, b) => a.order - b.order);

        const oldIndex = groupTemplates.findIndex((t) => t.id === activeTemplateId);
        let newIndex = groupTemplates.findIndex((t) => t.id === overTemplateId);

        // dropPositionに基づいて挿入位置を調整
        if (dropPosition === 'after') {
          newIndex = newIndex + 1;
        }
        
        // 要素削除による位置ずれを考慮
        if (oldIndex < newIndex) {
          newIndex = newIndex - 1;
        }

        if (oldIndex !== newIndex) {
          const newOrder = arrayMove(groupTemplates, oldIndex, newIndex);
          setTemplates((prev) => {
            const others = prev.filter((t) => t.groupId !== sourceGroupId);
            return [
              ...others,
              ...newOrder.map((t, i) => ({ ...t, order: i })),
            ];
          });
          await s.reorderTemplates(
            sourceGroupId,
            newOrder.map((t) => t.id)
          );
          await loadData();
        }
      } else {
        // グループ間での移動
        let targetIndex = 0;
        const targetGroupTemplates = templates
          .filter((t) => t.groupId === targetGroupId)
          .sort((a, b) => a.order - b.order);
        const overIdx = targetGroupTemplates.findIndex((t) => t.id === overTemplateId);
        if (overIdx !== -1) {
          targetIndex = overIdx + (dropPosition === 'after' ? 1 : 0);
        } else {
          targetIndex = targetGroupTemplates.length;
        }

        setTemplates((prev) => {
          const moved = { ...activeTemplate, groupId: targetGroupId, order: targetIndex };
          const filtered = prev.filter((t) => t.id !== activeTemplateId);
          const targetGroupTemplatesNew = [
            ...filtered.filter((t) => t.groupId === targetGroupId),
          ];
          targetGroupTemplatesNew.splice(targetIndex, 0, moved);
          const updatedTarget = targetGroupTemplatesNew.map((t, i) => ({ ...t, order: i }));
          const others = filtered.filter((t) => t.groupId !== targetGroupId);
          return [...others, ...updatedTarget];
        });
        
        await s.moveTemplateToGroup(activeTemplateId, targetGroupId, targetIndex);
        await loadData();
      }
    } 
    // グループヘッダーにドロップした場合（一番上に追加）
    else if (overIdStr.startsWith('group-header-')) {
      const targetGroupId = parseInt(overIdStr.replace('group-header-', ''), 10);
      
      if (activeTemplate.groupId !== targetGroupId) {
        setTemplates((prev) => {
          const moved = { ...activeTemplate, groupId: targetGroupId, order: 0 };
          const filtered = prev.filter((t) => t.id !== activeTemplateId);
          const targetGroupTemplates = [
            moved,
            ...filtered.filter((t) => t.groupId === targetGroupId),
          ];
          const updatedTarget = targetGroupTemplates.map((t, i) => ({ ...t, order: i }));
          const others = filtered.filter((t) => t.groupId !== targetGroupId);
          return [...others, ...updatedTarget];
        });
        await s.moveTemplateToGroup(activeTemplateId, targetGroupId, 0);
        await loadData();
      } else {
        const groupTemplates = templates
          .filter((t) => t.groupId === targetGroupId)
          .sort((a, b) => a.order - b.order);
        const oldIndex = groupTemplates.findIndex((t) => t.id === activeTemplateId);
        if (oldIndex > 0) {
          const newOrder = arrayMove(groupTemplates, oldIndex, 0);
          setTemplates((prev) => {
            const others = prev.filter((t) => t.groupId !== targetGroupId);
            return [
              ...others,
              ...newOrder.map((t, i) => ({ ...t, order: i })),
            ];
          });
          await s.reorderTemplates(targetGroupId, newOrder.map((t) => t.id));
          await loadData();
        }
      }
    } 
    // 追加ボタンにドロップした場合（一番下に追加）
    else if (overIdStr.startsWith('group-add-btn-')) {
      const targetGroupId = parseInt(overIdStr.replace('group-add-btn-', ''), 10);
      const targetGroupTemplates = templates.filter(
        (t) => t.groupId === targetGroupId
      );
      
      if (activeTemplate.groupId !== targetGroupId) {
        setTemplates((prev) => {
          const moved = { ...activeTemplate, groupId: targetGroupId, order: targetGroupTemplates.length };
          const filtered = prev.filter((t) => t.id !== activeTemplateId);
          const targetGroupTemplatesNew = [
            ...filtered.filter((t) => t.groupId === targetGroupId),
          ];
          targetGroupTemplatesNew.push(moved);
          const updatedTarget = targetGroupTemplatesNew.map((t, i) => ({ ...t, order: i }));
          const others = filtered.filter((t) => t.groupId !== targetGroupId);
          return [...others, ...updatedTarget];
        });
        await s.moveTemplateToGroup(
          activeTemplateId,
          targetGroupId,
          targetGroupTemplates.length
        );
        await loadData();
      } else {
        const groupTemplates = [...targetGroupTemplates].sort((a, b) => a.order - b.order);
        const oldIndex = groupTemplates.findIndex((t) => t.id === activeTemplateId);
        if (oldIndex < groupTemplates.length - 1) {
          const newOrder = arrayMove(groupTemplates, oldIndex, groupTemplates.length - 1);
          setTemplates((prev) => {
            const others = prev.filter((t) => t.groupId !== targetGroupId);
            return [
              ...others,
              ...newOrder.map((t, i) => ({ ...t, order: i })),
            ];
          });
          await s.reorderTemplates(targetGroupId, newOrder.map((t) => t.id));
          await loadData();
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTemplateId(null);
    setOverTemplateId(null);
    setOverHeaderGroupId(null);
    setOverAddBtnGroupId(null);
    setActiveGroupId(null);
    setOverGroupId(null);
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
      onDragEnd={(e) => {
        const activeIdStr = String(e.active.id);
        if (activeIdStr.startsWith('group-')) {
          handleGroupDragEnd(e);
        } else if (activeIdStr.startsWith('template-')) {
          handleDragEnd(e);
        }
      }}
      onDragCancel={handleDragCancel}
    >
      <div className="options-container">
        <header className="options-header">
          <h1>PromptTemplate</h1>
        </header>

        <button className="add-group-btn" onClick={handleAddGroup}>
          <Icons.Add />
          グループを追加
        </button>

        {groups.length === 0 ? (
          <div className="empty-state">
            <p>まだグループがありません</p>
            <p>「グループを追加」ボタンをクリックして開始しましょう</p>
          </div>
        ) : (
          <div className="groups-container">
            {groups.map((group) => {
              const groupTemplates = getTemplatesForGroup(group.id);
              const groupOverTemplateId = groupTemplates.find(
                (t) => t.id === overTemplateId
              )?.id ?? null;
              const draggedTemplate = activeTemplateId
                ? templates.find((t) => t.id === activeTemplateId)
                : undefined;
              const isHeaderDropTarget = overHeaderGroupId === group.id;
              const isAddBtnDropTarget = overAddBtnGroupId === group.id;
              const isCrossGroupDrag =
                draggedTemplate !== undefined &&
                draggedTemplate.groupId !== group.id &&
                (groupOverTemplateId !== null || isHeaderDropTarget || isAddBtnDropTarget);

              const isGroupDragging = activeGroupId === group.id;
              const isGroupDropTarget = overGroupId === group.id;

              return (
                <GroupItem
                  key={group.id}
                  group={group}
                  templates={groupTemplates}
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
                  overTemplateId={groupOverTemplateId}
                  dropPosition={dropPosition}
                  isHeaderDropTarget={isHeaderDropTarget}
                  isAddBtnDropTarget={isAddBtnDropTarget}
                  isCrossGroupDrag={isCrossGroupDrag}
                  groupDraggableId={`group-${group.id}`}
                  isGroupDragging={isGroupDragging}
                  isGroupDropTarget={isGroupDropTarget}
                  groupDropPosition={groupDropPosition}
                />
              );
            })}
          </div>
        )}

        {isModalOpen && (
          <TemplateModal
            template={editingTemplate}
            groupId={addingToGroupId}
            onSave={handleSaveTemplate}
            onClose={handleCloseModal}
          />
        )}

        <DragOverlay dropAnimation={
          { duration: 180, easing: 'ease-out' }
        }>
          {activeTemplate ? (
            <div className="template-item drag-overlay">
              <DragHandle />
              <span className="template-name">{activeTemplate.name}</span>
              <div className="template-actions">
                <button className="icon-btn" title="編集">
                  <Icons.Edit />
                </button>
                <button className="icon-btn delete" title="削除">
                  <Icons.Delete />
                </button>
              </div>
            </div>
          ) : null}

          {activeGroup ? (
            <div className="group-item dragging-overlay">
               <div className="group-header">
                  <button className="expand-btn">
                    <Icons.ExpandMore />
                  </button>
                  <span className="group-name">{activeGroup.name}</span>
               </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default Options;