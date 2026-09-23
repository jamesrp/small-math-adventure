// Small HTML helpers shared by the ten additional puzzle types. Native controls
// keep the same tap, keyboard, and screen-reader interaction.
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const actionButton = (label, action, extra = '') => `<button type="button" class="secondary expansion-action" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="move-${esc(JSON.stringify(action))}" ${extra}>${label}</button>`;
export const selectField = (name, label, options, value) => `<label class="expansion-field">${esc(label)}<select name="${esc(name)}" data-focus="field-${esc(name)}">${options.map(option => {const item = typeof option === 'object' ? option : {value:option,label:option}; return `<option value="${esc(item.value)}" ${String(item.value) === String(value) ? 'selected' : ''}>${esc(item.label)}</option>`;}).join('')}</select></label>`;
export const submitButton = label => `<button type="submit" class="primary" data-focus="submit-puzzle">${esc(label)}</button>`;
