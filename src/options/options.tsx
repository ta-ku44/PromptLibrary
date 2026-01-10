import React from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import Icons from './assets/icons.ts';
import type { Template } from '../types/index';
import TemplateModal from './components/EntryEditor.tsx';
import CategoryItem from './components/CategoryPanel.tsx';
import DragHandle from './components/DragHandle.tsx';
import DropGap from './components/DropGap.tsx';
import { useGroupsAndTemplates } from './hooks/useCategoryAndTemplates.ts';
import { useUIState } from './hooks/useUIState';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import './styles.scss';

const Options: React.FC = () => {
  const {
    categories,
    templates,
    setCategories,
    setTemplates,
    addCategory,
    deleteCategory,
    updateCategoryName,
    reorderCategories,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    moveTemplateToCategory,
    reorderTemplates,
    getTemplatesForCategory,
  } = useGroupsAndTemplates();

  const {
    expandedCategories,
    setExpandedCategories,
    editingTemplate,
    addingToCategoryId,
    isModalOpen,
    editingCategoryId,
    toggleCategory,
    openAddTemplateModal,
    openEditTemplateModal,
    closeModal,
    startEditingCategory,
    finishEditingCategory,
  } = useUIState(categories.map((c) => c.id));

  const {
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
  } = useDragAndDrop({
    categories,
    templates,
    expandedCategories,
    setExpandedCategories,
    setCategories,
    setTemplates,
    reorderCategories,
    moveTemplateToCategory,
    reorderTemplates,
  });

  const handleAddCategory = async () => {
    const newCategoryId = await addCategory();
    startEditingCategory(newCategoryId);
  };

  const handleSaveTemplate = async (templateData: Partial<Template> & { categoryId: number | null }) => {
    if (templateData.id) {
      await updateTemplate(templateData.id, {
        name: templateData.name,
        content: templateData.content,
      });
    } else {
      await addTemplate({
        categoryId: templateData.categoryId,
        name: templateData.name || '',
        content: templateData.content || '',
      });
    }
    closeModal();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="options-container">
        <header className="options-header">
          <h1>PromptLibrary</h1>
        </header>
        <div className="category-area">
          <div className="category-area__header">
            <button className="button button--add-category" onClick={handleAddCategory}>
              <Icons.PlaylistAdd />
              カテゴリを追加
            </button>
          </div>
          {categories.length === 0 ? (
            <div className="empty-state">
              <p>まだカテゴリがありません</p>
              <p>「追加」ボタンをクリックして開始しましょう</p>
            </div>
          ) : (
            <div className="category-area__list">
              {categories.map((category, idx) => {
                // Other カテゴリ（id: -1）の場合は特別に処理
                const isOtherCategory = category.id === -1;

                return (
                  <React.Fragment key={category.id}>
                    {/* 全ての前にギャップを表示 */}
                    <DropGap
                      type="category-gap"
                      indexOrId={idx}
                      isActive={activeGroupGapId === `category-gap-${idx}`}
                      isDraggingGroup={activeCategoryId !== null}
                    />

                    <CategoryItem
                      category={category}
                      templates={getTemplatesForCategory(category.id)}
                      isExpanded={expandedCategories.has(category.id)}
                      onToggle={() => toggleCategory(category.id)}
                      onEdit={openEditTemplateModal}
                      onDeleteTemplate={deleteTemplate}
                      onTemplateNameChange={(id, name) => updateTemplate(id, { name })}
                      onCategoryNameChange={updateCategoryName}
                      onDeleteCategory={deleteCategory}
                      onAddTemplate={openAddTemplateModal}
                      startEditing={editingCategoryId === category.id}
                      onEditingComplete={finishEditingCategory}
                      activeTemplateId={activeTemplateId}
                      activeGapId={activeTemplateGapId}
                      categoryDraggableId={`category-${category.id}`}
                      isCategoryDragging={activeCategoryId === category.id}
                      isAnyCategoryDragging={activeCategoryId !== null && !isOtherCategory}
                    />
                  </React.Fragment>
                );
              })}
              {/* Other カテゴリの後のギャップは表示しない */}
              {!categories.some((c) => c.id === -1) && (
                <DropGap
                  type="category-gap"
                  indexOrId={categories.length}
                  isActive={activeGroupGapId === `category-gap-${categories.length}`}
                  isDraggingGroup={activeCategoryId !== null}
                />
              )}
            </div>
          )}
        </div>

        {isModalOpen && (
          <TemplateModal
            template={editingTemplate}
            categoryId={addingToCategoryId}
            onSave={handleSaveTemplate}
            onClose={closeModal}
          />
        )}

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {activeTemplate && (
            <div className="template template--drag-overlay">
              <DragHandle />
              <span className="template__name">{activeTemplate.name}</span>
              <div className="template__actions">
                <button className="button button--icon">
                  <Icons.Edit />
                </button>
                <button className="button button--icon button--icon--delete">
                  <Icons.Delete />
                </button>
              </div>
            </div>
          )}

          {activeCategory && (
            <div className="category category--drag-overlay">
              <div className="category__header">
                <button className="button button--expand">
                  <Icons.ExpandMore />
                </button>
                <span className="category__name">{activeCategory.name}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default Options;
