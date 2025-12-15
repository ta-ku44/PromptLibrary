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
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null); // ドラッグ中のグループ
  const [overGroupId, setOverGroupId] = useState<number | null>(null); // ホバー中のグループ
  const [groupDropPosition, setGroupDropPosition] = useState<'before' | 'after'>('before'); // ドロップ位置

  // テンプレートのドラッグ状態
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null); // ドラッグ中のテンプレート
  const [activeGapId, setActiveGapId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }), // 10px以上動かした場合のみドラッグ開始
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
      setActiveGapId(null);
      setOverGroupId(null);
      return;
    }

    const overId = String(over.id);
    const isAfter = delta.y > 0;
    const position: 'before' | 'after' = isAfter ? 'after' : 'before';

    //* グループをドラッグ中の場合
    if (String(active.id).startsWith('group-')) {
      if (overId.startsWith('group-')) {
        setOverGroupId(Number(overId.replace('group-', '')));
        // ドラッグ方向でドロップ位置を決定
        setGroupDropPosition(position);
      } else {
        setOverGroupId(null);
      }
      return;
    }

    //* テンプレートをドラッグ中の場合
    
    // gapに直接ホバーした場合
    if (overId.startsWith('gap-')) {
      setActiveGapId(overId);
      return;
    }

    // gap以外の要素からgapを推測
    let targetGapId: string | null = null;

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
    
    setActiveGapId(targetGapId);
  };

  //* グループのドラッグ終了処理
  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGroupId(null);
    setOverGroupId(null);
    setGroupDropPosition('before');
    setActiveGapId(null);
    
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
    setActiveGapId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    if (!activeIdStr.startsWith('template-')) return;
    const finalGapId = activeGapId;

    if (!finalGapId || !finalGapId.startsWith('gap-')) return;

    const activeTemplateId = parseInt(activeIdStr.replace('template-', ''), 10);
    const activeTemplate = templates.find((t) => t.id === activeTemplateId);
    if (!activeTemplate) return;

    // gapへのドロップのみ処理
    if (!activeTemplate) return;

    // gap IDからグループIDとインデックスを抽出
    const parts = finalGapId.split('-');
    if (parts.length !== 3) return;

    const targetGroupId = parseInt(parts[1], 10);
    const targetIndex = parseInt(parts[2], 10);

    if (isNaN(targetGroupId) || isNaN(targetIndex)) return;

    const isCrossGroup = activeTemplate.groupId !== targetGroupId;

    if (isCrossGroup) {
      // グループ間での移動
      setTemplates((prev) => {
        const moved = { ...activeTemplate, groupId: targetGroupId, order: targetIndex };
        const filtered = prev.filter((t) => t.id !== activeTemplateId);
        const targetGroupTemplates = filtered.filter((t) => t.groupId === targetGroupId);
        
        targetGroupTemplates.splice(targetIndex, 0, moved);
        const updatedTarget = targetGroupTemplates.map((t, i) => ({ ...t, order: i }));
        
        const others = filtered.filter((t) => t.groupId !== targetGroupId);
        return [...others, ...updatedTarget];
      });

      await s.moveTemplateToGroup(activeTemplateId, targetGroupId, targetIndex);
      await loadData();
    } else {
      // 同じグループ内での移動
      const groupTemplates = templates
        .filter((t) => t.groupId === targetGroupId)
        .sort((a, b) => a.order - b.order);

      const oldIndex = groupTemplates.findIndex((t) => t.id === activeTemplateId);
      let newIndex = targetIndex;

      if (oldIndex < targetIndex) {
        newIndex = targetIndex - 1;
      }

      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(groupTemplates, oldIndex, newIndex);
        
        setTemplates((prev) => {
          const others = prev.filter((t) => t.groupId !== targetGroupId);
          return [
            ...others,
            ...newOrder.map((t, i) => ({ ...t, order: i })),
          ];
        });
        
        await s.reorderTemplates(
          targetGroupId,
          newOrder.map((t) => t.id)
        );
        await loadData();
      }
    }
    console.groupEnd();
  };

  const handleDragCancel = () => {
    setActiveTemplateId(null);
    setActiveGapId(null);
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
    // ドラッグ&ドロップのコンテキスト
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

        {/* グループが存在しない場合の空状態表示 */}
        {groups.length === 0 ? (
          <div className="empty-state">
            <p>まだグループがありません</p>
            <p>「グループを追加」ボタンをクリックして開始しましょう</p>
          </div>
        ) : (
          // グループ一覧
          <div className="groups-container">
            {groups.map((group) => (
              <GroupItem
                key={group.id}
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
                activeGapId={activeGapId}
                groupDraggableId={`group-${group.id}`}
                isGroupDragging={activeGroupId === group.id}
                isGroupDropTarget={overGroupId === group.id}
                groupDropPosition={groupDropPosition}
              />
            ))}
          </div>
        )}

        {/* テンプレート編集モーダル */}
        {isModalOpen && (
          <TemplateModal
            template={editingTemplate}
            groupId={addingToGroupId}
            onSave={handleSaveTemplate}
            onClose={handleCloseModal}
          />
        )}

        {/* ドラッグ中のオーバーレイ表示 */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {/* テンプレートのドラッグ表示 */}
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

          {/* グループのドラッグ表示 */}
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