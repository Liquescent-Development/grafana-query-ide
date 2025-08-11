/**
 * Shared utility for managing lists with tagging, favorites, renaming, etc.
 * Used by both Query History and AI Conversations
 */
const ListManager = {
    
    /**
     * Show inline edit for item title/name
     * @param {string} itemId - Unique identifier for the item
     * @param {string} currentValue - Current title/name value
     * @param {Function} onSave - Callback when save is complete: (newValue) => {}
     * @param {Object} options - Optional styling and behavior options
     */
    showInlineEdit(itemId, currentValue, onSave, options = {}) {
        const selector = options.selector || `[data-id="${itemId}"] .title, [data-conversation-id="${itemId}"] .conversation-title`;
        const titleElement = document.querySelector(selector);
        if (!titleElement) {
            console.warn('Title element not found for inline edit:', selector);
            return;
        }

        // Create inline edit input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = options.inputClass || 'inline-edit-input';
        input.style.cssText = options.inputStyle || `
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(0, 122, 204, 0.5);
            color: #cccccc;
            font-size: 12px;
            padding: 4px 6px;
            border-radius: 3px;
            width: 100%;
            font-family: inherit;
        `;

        // Replace title with input
        titleElement.style.display = 'none';
        titleElement.parentElement.insertBefore(input, titleElement.nextSibling);
        input.focus();
        input.select();

        const finishEdit = (save = false) => {
            const newValue = input.value.trim();
            
            if (save && newValue && newValue !== currentValue) {
                onSave(newValue);
            } else {
                // Just restore the original display
                input.remove();
                titleElement.style.display = '';
            }
        };

        // Handle save/cancel
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finishEdit(false);
            }
        });

        input.addEventListener('blur', () => finishEdit(true));
    },

    /**
     * Show tags input overlay
     * @param {string} title - Dialog title
     * @param {string[]} currentTags - Current tags array
     * @param {Function} onSave - Callback when tags are saved: (tags) => {}
     * @param {Object} options - Optional styling and behavior options
     */
    showTagsInput(title, currentTags = [], onSave, options = {}) {
        // Remove any existing overlay
        const existingOverlay = document.querySelector('.tags-input-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'tags-input-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #252526;
            border: 1px solid #454545;
            border-radius: 8px;
            padding: 20px;
            min-width: 300px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        `;

        const currentTagsStr = currentTags.join(', ');
        dialog.innerHTML = `
            <h3 style="color: #cccccc; margin: 0 0 16px 0; font-size: 14px;">${title}</h3>
            <input type="text" class="tags-input" placeholder="Enter tags separated by commas..." value="${currentTagsStr}" style="
                width: 100%;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #cccccc;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                font-family: inherit;
                margin-bottom: 16px;
            ">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="cancel-btn" style="
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #cccccc;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">Cancel</button>
                <button class="save-btn" style="
                    background: rgba(0, 122, 204, 0.8);
                    border: 1px solid rgba(0, 122, 204, 1);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">Save Tags</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = dialog.querySelector('.tags-input');
        const saveBtn = dialog.querySelector('.save-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');

        input.focus();
        input.select();

        const close = () => overlay.remove();

        const saveTags = () => {
            const tagsStr = input.value.trim();
            const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            onSave(tags);
            close();
        };

        saveBtn.addEventListener('click', saveTags);
        cancelBtn.addEventListener('click', close);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveTags();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
            }
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    },

    /**
     * Show full edit form overlay (for more complex editing)
     * @param {string} title - Dialog title
     * @param {Object} currentData - Current item data {label, tags, etc}
     * @param {Function} onSave - Callback when saved: (data) => {}
     * @param {Object} options - Field configuration and styling
     */
    showEditForm(title, currentData, onSave, options = {}) {
        const fields = options.fields || [
            { key: 'label', label: 'Label', type: 'text', placeholder: 'Enter a descriptive label' },
            { key: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'tag1, tag2, tag3' }
        ];

        // Remove any existing overlay
        const existingOverlay = document.querySelector('.edit-form-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Helper function for escaping HTML
        const escapeHtml = (text) => {
            if (!text) return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, (m) => map[m]);
        };

        const fieldsHtml = fields.map(field => {
            let value = currentData[field.key] || '';
            if (field.key === 'tags' && Array.isArray(value)) {
                value = value.join(', ');
            }
            
            return `
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; color: #cccccc; font-size: 12px;">${field.label}</label>
                    <input type="${field.type}" data-key="${field.key}" value="${escapeHtml(value)}" 
                           placeholder="${field.placeholder}" style="
                        width: 100%;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: #cccccc;
                        padding: 8px 12px;
                        border-radius: 4px;
                        font-size: 13px;
                        font-family: inherit;
                    ">
                </div>
            `;
        }).join('');

        const formHtml = `
            <div class="edit-form-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div class="edit-form-dialog" style="
                    background: #252526;
                    border: 1px solid #454545;
                    border-radius: 8px;
                    padding: 20px;
                    min-width: 400px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                ">
                    <h3 style="color: #cccccc; margin: 0 0 16px 0; font-size: 14px;">${title}</h3>
                    <form class="edit-form">
                        ${fieldsHtml}
                        <div class="form-buttons" style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
                            <button type="button" class="cancel-btn" style="
                                background: transparent;
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                color: #cccccc;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Cancel</button>
                            <button type="submit" class="save-btn" style="
                                background: rgba(0, 122, 204, 0.8);
                                border: 1px solid rgba(0, 122, 204, 1);
                                color: white;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHtml);

        const overlay = document.querySelector('.edit-form-overlay');
        const form = overlay.querySelector('.edit-form');
        const cancelBtn = overlay.querySelector('.cancel-btn');

        const close = () => overlay.remove();

        const save = (e) => {
            if (e) e.preventDefault();
            
            const data = {};
            fields.forEach(field => {
                const input = form.querySelector(`[data-key="${field.key}"]`);
                let value = input.value.trim();
                
                if (field.key === 'tags') {
                    value = value ? value.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
                }
                
                data[field.key] = value;
            });

            onSave(data);
            close();
        };

        form.addEventListener('submit', save);
        cancelBtn.addEventListener('click', close);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        // Focus first input
        const firstInput = form.querySelector('input');
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    },

    /**
     * Create a context menu for list items
     * @param {Event} event - Click event to position menu
     * @param {Array} menuItems - Menu items: [{label, icon, action, className}]
     */
    showContextMenu(event, menuItems) {
        event.preventDefault();
        event.stopPropagation();

        // Remove any existing menu
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            background-color: #252526;
            border: 1px solid #454545;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            padding: 4px 0;
            min-width: 140px;
            font-size: 12px;
            z-index: 10000;
        `;

        const menuItemsHtml = menuItems.map(item => `
            <div class="context-menu-item ${item.className || ''}" data-action="${item.action}">
                ${item.icon ? `<span class="menu-icon">${item.icon}</span>` : ''}
                <span class="menu-label">${item.label}</span>
            </div>
        `).join('');

        menu.innerHTML = menuItemsHtml;

        // Position menu
        const rect = event.target.getBoundingClientRect();
        menu.style.top = event.clientY + 4 + 'px';
        menu.style.left = event.clientX - 120 + 'px';

        document.body.appendChild(menu);

        // Handle menu item clicks
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const action = item.dataset.action;
                const menuItem = menuItems.find(mi => mi.action === action);
                if (menuItem && menuItem.handler) {
                    menuItem.handler();
                }
                menu.remove();
            }
        });

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
};

// Add shared CSS for the components
const style = document.createElement('style');
style.textContent = `
    .context-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        color: #cccccc;
        transition: background-color 0.15s ease;
    }
    
    .context-menu-item:hover {
        background-color: #2a2d2e;
    }
    
    .context-menu-item.danger {
        color: #f48771;
    }
    
    .context-menu-item.danger:hover {
        background-color: rgba(244, 135, 113, 0.1);
    }
    
    .context-menu .menu-icon {
        opacity: 0.8;
        width: 14px;
        text-align: center;
    }
`;
document.head.appendChild(style);