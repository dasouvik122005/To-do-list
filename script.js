document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('task-form');
  const input = document.getElementById('input-box');
  const list = document.getElementById('list-container');
  const totalCount = document.getElementById('total-count');
  const completedCount = document.getElementById('completed-count');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const clearAllBtn = document.getElementById('clear-all');

  let tasks = load();

  render();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    tasks.push({
      id: Date.now().toString(),
      text,
      done: false,
      createdAt: new Date().toISOString()
    });
    input.value = '';
    save();
    render();
    input.focus();
  });

  list.addEventListener('click', (e) => {
    const id = e.target.closest('li')?.dataset?.id;
    if (!id) return;
    if (e.target.matches('input[type="checkbox"]')) {
      toggleDone(id);
    } else if (e.target.matches('.delete-btn')) {
      removeTask(id);
    }
  });

  clearCompletedBtn.addEventListener('click', () => {
    tasks = tasks.filter(t => !t.done);
    save(); render();
  });

  clearAllBtn.addEventListener('click', () => {
    if (!tasks.length) return;
    if (!confirm('Delete all tasks? This cannot be undone.')) return;
    tasks = [];
    save(); render();
  });

  function render() {
    list.innerHTML = '';
    tasks.forEach(t => {
      const li = document.createElement('li');
      li.className = 'task-item' + (t.done ? ' completed' : '');
      li.dataset.id = t.id;
      li.innerHTML = `
        <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Mark task done">
        <div class="task-body" style="flex:1;display:flex;flex-direction:column;gap:4px">
          <span class="label">${escapeHtml(t.text)}</span>
          <time class="meta" datetime="${t.createdAt}" style="font-size:.85rem;color:var(--muted)">${formatDate(t.createdAt)}</time>
        </div>
        <button class="delete-btn" aria-label="Delete task">✕</button>
      `;
      list.appendChild(li);
    });
    totalCount.textContent = tasks.length;
    completedCount.textContent = tasks.filter(t => t.done).length;
  }

  function toggleDone(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save(); render();
  }

  function removeTask(id) {
    tasks = tasks.filter(x => x.id !== id);
    save(); render();
  }

  function save() {
    localStorage.setItem('todo.tasks.v1', JSON.stringify(tasks));
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem('todo.tasks.v1')) || [];
      // ensure older tasks get a timestamp
      return raw.map(t => {
        if (!t.createdAt) t.createdAt = new Date().toISOString();
        return t;
      });
    } catch {
      return [];
    }
  }

  function escapeHtml(s) {
    return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }
});
