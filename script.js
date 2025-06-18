// Helper selectors
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// DOM Elements
const inputBox = $("#input-box");
const dueInput = $("#due-date");
const tagBox = $("#tag-box");
const prioritySelect = $("#priority-select");
const addBtn = $("#add-btn");
const clearCompletedBtn = $("#clear-completed-btn");
const downloadBtn = $("#download-tasks-btn");
const pendingCount = $("#pending-tasks-count");
const themeToggle = $("#theme-toggle");
const searchBox = $("#search-box");
const filterPriority = $("#filter-priority");
const filterStatus = $("#filter-status");
const sortBy = $("#sort-by"); // New selector

// Lists
const lists = {
  high: $("#high-priority-list"),
  medium: $("#medium-priority-list"),
  low: $("#low-priority-list"),
};

// Data storage
let tasks = JSON.parse(localStorage.getItem("todoData") || "[]");
let draggedItem = null;

/* -----------------------------
   Initialization
----------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadFiltersAndSort(); // New: Load saved filters/sort
  renderAll();
});

/* -----------------------------
   Theme Toggle
----------------------------- */
function loadTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", saved === "dark");
  themeToggle.innerHTML = saved === "dark" ? "<i class='fas fa-sun'></i>" : "<i class='fas fa-moon'></i>";
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.innerHTML = isDark ? "<i class='fas fa-sun'></i>" : "<i class='fas fa-moon'></i>";
});

/* -----------------------------
   Add Task
----------------------------- */
addBtn.addEventListener("click", addTask);
inputBox.addEventListener("keypress", (e) => e.key === "Enter" && addTask());

function addTask() {
  const text = inputBox.value.trim();
  if (!text) return alert("Please enter a task.");
  const task = {
    id: Date.now(),
    text,
    priority: prioritySelect.value,
    due: dueInput.value,
    tag: tagBox.value.trim(),
    checked: false,
  };
  tasks.push(task);
  save();
  renderAll(); // Re-render all to ensure correct sorting and filtering on new task addition
  clearInputs();
}

function clearInputs() {
  inputBox.value = "";
  dueInput.value = "";
  tagBox.value = "";
  prioritySelect.value = "low";
}

/* -----------------------------
   Render Functions
----------------------------- */
function renderAll() {
  applySorting(); // Apply sorting before rendering

  // Clear lists
  Object.values(lists).forEach((ul) => (ul.innerHTML = ""));
  // Add tasks
  tasks.forEach(renderTask);
  updatePendingCount();
  filterRender(); // Apply filters after initial render
}

function renderTask(task) {
  const ul = lists[task.priority];
  if (!ul) return;
  // Build LI
  const li = document.createElement("li");
  li.draggable = true;
  li.dataset.id = task.id;
  if (task.checked) li.classList.add("checked");

  li.innerHTML = `
    <span class="badge ${task.priority}"></span>
    <span class="task-text">${task.text}</span>
    ${task.tag ? `<span class="tag">${task.tag}</span>` : ""}
    ${task.due ? `<span class="due">${formatDate(task.due)}</span>` : ""}
    <span class="edit"><i class="fas fa-edit"></i></span> <span class="delete"><i class="fas fa-times"></i></span>
  `;

  // Delete event
  li.querySelector(".delete").addEventListener("click", () => {
    if (confirm("Delete this task?")) {
      tasks = tasks.filter((t) => t.id !== task.id);
      save();
      li.remove();
      updatePendingCount();
      checkEmptyMessage(ul);
    }
  });

  // Edit event
  li.querySelector(".edit").addEventListener("click", () => {
    inputBox.value = task.text;
    dueInput.value = task.due;
    tagBox.value = task.tag;
    prioritySelect.value = task.priority;

    // Change Add button to Update button
    addBtn.innerHTML = "<i class='fas fa-check'></i> Update";
    addBtn.removeEventListener("click", addTask); // Remove old listener
    addBtn.addEventListener("click", function updateTaskHandler() {
      const newText = inputBox.value.trim();
      if (!newText) {
        alert("Please enter a task.");
        return;
      }
      task.text = newText;
      task.due = dueInput.value;
      task.tag = tagBox.value.trim();
      task.priority = prioritySelect.value;
      save();
      renderAll(); // Re-render all to ensure correct placement/sorting if priority changed
      clearInputs();
      addBtn.innerHTML = "<i class='fas fa-plus'></i> Add"; // Revert button
      addBtn.removeEventListener("click", updateTaskHandler); // Remove this listener
      addBtn.addEventListener("click", addTask); // Re-add original addTask listener
    });
  });

  // Toggle complete - MODIFIED
  li.addEventListener("click", (e) => {
    if (e.target.closest(".delete")) return; // ignore when delete clicked

    const t = tasks.find((t) => t.id === task.id);

    // Only allow marking as complete if it's not already complete
    if (!t.checked) {
      li.classList.add("checked"); // Force add 'checked' class
      t.checked = true; // Set task to checked
      save();
      updatePendingCount();
    }
    // If t.checked is already true, nothing happens, preventing unmarking.
  });

  // Drag events
  li.addEventListener("dragstart", () => {
    draggedItem = li;
    li.classList.add("dragging");
  });
  li.addEventListener("dragend", () => {
    draggedItem = null;
    li.classList.remove("dragging");
  });

  ul.appendChild(li);
  checkEmptyMessage(ul);
  updatePendingCount();
}

/* Dragover handling for each list */
$$(".task-list").forEach((ul) => {
  ul.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterEl = getDragAfterElement(ul, e.clientY);
    const draggable = document.querySelector(".dragging");
    if (!draggable) return;
    if (afterEl == null) {
      ul.appendChild(draggable);
    } else {
      ul.insertBefore(draggable, afterEl);
    }
  });
  ul.addEventListener("drop", () => {
    if (draggedItem) {
      const id = +draggedItem.dataset.id;
      const t = tasks.find((t) => t.id === id);
      if (t) { // Ensure task exists before modifying
        t.priority = ul.id.replace("-priority-list", "");
        save();
        // Re-render all tasks to ensure correct sorting and filtering after a drag-drop priority change
        renderAll();
      }
      checkEmptyMessage(ul);
      Object.values(lists).forEach(checkEmptyMessage);
    }
  });
});

function getDragAfterElement(container, y) {
  const draggables = [...container.querySelectorAll("li:not(.dragging):not(.empty-message)")]; // Exclude empty message
  return draggables.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

/* -----------------------------
   Sorting Functions
----------------------------- */
function applySorting() {
  const sortOption = sortBy.value;
  switch (sortOption) {
    case "added-asc":
      tasks.sort((a, b) => a.id - b.id);
      break;
    case "added-desc":
      tasks.sort((a, b) => b.id - a.id);
      break;
    case "due-asc":
      tasks.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1; // tasks without due date go to end
        if (!b.due) return -1; // tasks without due date go to end
        return new Date(a.due) - new Date(b.due);
      });
      break;
    case "due-desc":
      tasks.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return new Date(b.due) - new Date(a.due);
      });
      break;
    case "priority-desc":
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
      break;
  }
  save(); // Save the sorted order
}


/* -----------------------------
   Filtering & Search (and Sorting persistence)
----------------------------- */
[searchBox, filterPriority, filterStatus, sortBy].forEach((el) => el.addEventListener("input", () => {
  localStorage.setItem("searchQuery", searchBox.value);
  localStorage.setItem("filterPriority", filterPriority.value);
  localStorage.setItem("filterStatus", filterStatus.value);
  localStorage.setItem("sortBy", sortBy.value);
  renderAll(); // Re-render to apply sort and filter
}));

// New function to load saved filters/sort preferences
function loadFiltersAndSort() {
  const savedFilterPriority = localStorage.getItem("filterPriority");
  const savedFilterStatus = localStorage.getItem("filterStatus");
  const savedSearchQuery = localStorage.getItem("searchQuery");
  const savedSortBy = localStorage.getItem("sortBy");

  if (savedFilterPriority) filterPriority.value = savedFilterPriority;
  if (savedFilterStatus) filterStatus.value = savedFilterStatus;
  if (savedSearchQuery) searchBox.value = savedSearchQuery;
  if (savedSortBy) sortBy.value = savedSortBy;
}


function filterRender() {
  const q = searchBox.value.toLowerCase();
  const p = filterPriority.value;
  const s = filterStatus.value;

  $$(".task-list li").forEach((li) => {
    if (li.classList.contains("empty-message")) {
      li.style.display = "block"; // Always show empty message if no tasks
      return;
    }
    const id = +li.dataset.id;
    const t = tasks.find((t) => t.id === id);
    if (!t) { // Handle case where task might have been deleted but element still exists
      li.style.display = "none";
      return;
    }

    let visible = true;
    if (p !== "all" && t.priority !== p) visible = false;
    if (s === "pending" && t.checked) visible = false;
    if (s === "completed" && !t.checked) visible = false;
    if (q && !t.text.toLowerCase().includes(q) && !(t.tag && t.tag.toLowerCase().includes(q))) visible = false;
    li.style.display = visible ? "flex" : "none";
  });

  // After filtering, check if any tasks are visible in each priority section
  Object.values(lists).forEach(checkEmptyMessage);
}

/* -----------------------------
   Clear Completed & Download
----------------------------- */
clearCompletedBtn.addEventListener("click", () => {
  if (!confirm("Clear all completed tasks?")) return;
  tasks = tasks.filter((t) => !t.checked);
  save();
  renderAll();
});

downloadBtn.addEventListener("click", () => {
    // Ensure jsPDF is loaded
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert("Error: jsPDF library not loaded. Please check your internet connection or CDN link.");
        return;
    }

    const { jsPDF } = window.jspdf; // Get jsPDF from the global window object
    const doc = new jsPDF(); // Initialize a new PDF document

    let yOffset = 15; // Starting Y position for text
    const margin = 15;
    const lineHeight = 10;

    // Title
    doc.setFontSize(22);
    doc.text("My To-Do List", margin, yOffset);
    yOffset += 15;

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yOffset);
    yOffset += 15;

    if (tasks.length === 0) {
        doc.setFontSize(14);
        doc.text("No tasks to display.", margin, yOffset);
        doc.save("tasks.pdf");
        return;
    }

    // Header for tasks table-like structure (optional, but good for readability)
    doc.setFontSize(10);
    doc.setTextColor(100); // Grey color for header
    doc.text("STATUS", margin, yOffset);
    doc.text("PRIORITY", margin + 30, yOffset);
    doc.text("DUE DATE", margin + 60, yOffset);
    doc.text("TAG", margin + 90, yOffset);
    doc.text("TASK DESCRIPTION", margin + 120, yOffset);
    yOffset += lineHeight / 2;
    doc.line(margin, yOffset, doc.internal.pageSize.width - margin, yOffset); // Underline header
    yOffset += lineHeight;
    doc.setTextColor(0); // Reset text color to black

    tasks.forEach(task => {
        // Check if new page is needed
        if (yOffset > doc.internal.pageSize.height - margin - lineHeight) {
            doc.addPage();
            yOffset = margin;
            // Re-add headers on new page
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("STATUS", margin, yOffset);
            doc.text("PRIORITY", margin + 30, yOffset);
            doc.text("DUE DATE", margin + 60, yOffset);
            doc.text("TAG", margin + 90, yOffset);
            doc.text("TASK DESCRIPTION", margin + 120, yOffset);
            yOffset += lineHeight / 2;
            doc.line(margin, yOffset, doc.internal.pageSize.width - margin, yOffset);
            yOffset += lineHeight;
            doc.setTextColor(0);
        }

        const status = task.checked ? "Done" : "Pending";
        const dueDate = task.due ? new Date(task.due).toLocaleDateString() : "N/A";
        const tag = task.tag || "N/A";

        // Set color for priority
        switch (task.priority) {
            case 'high':
                doc.setTextColor(231, 76, 60); // Red
                break;
            case 'medium':
                doc.setTextColor(241, 196, 15); // Yellow
                break;
            case 'low':
                doc.setTextColor(46, 204, 113); // Green
                break;
            default:
                doc.setTextColor(0); // Black
        }
        doc.text(task.priority.toUpperCase(), margin + 30, yOffset);
        doc.setTextColor(0); // Reset to black for other fields

        // Task details
        doc.text(status, margin, yOffset);
        doc.text(dueDate, margin + 60, yOffset);
        doc.text(tag, margin + 90, yOffset);

        // Auto-wrap task text
        const textLines = doc.splitTextToSize(task.text, doc.internal.pageSize.width - margin - (margin + 120));
        doc.text(textLines, margin + 120, yOffset);

        yOffset += (textLines.length * lineHeight) + 2; // Adjust yOffset based on text lines
    });

    doc.save("tasks.pdf");
});

/* -----------------------------
   Helpers
----------------------------- */
function save() {
  localStorage.setItem("todoData", JSON.stringify(tasks));
}

function updatePendingCount() {
  const pending = tasks.filter((t) => !t.checked).length;
  pendingCount.textContent = `${pending} pending task${pending !== 1 ? "s" : ""}`;
}

function checkEmptyMessage(ul) {
  // Only count visible tasks for checking empty message
  const hasVisibleTask = ul.querySelectorAll("li:not(.empty-message):not([style*='display: none'])").length > 0;
  let msg = ul.querySelector(".empty-message");
  if (hasVisibleTask) {
    msg && (msg.style.display = "none");
  } else {
    if (!msg) {
      msg = document.createElement("li");
      msg.className = "empty-message";
      msg.textContent = `No ${ul.id.replace("-priority-list", "").toLowerCase()} priority tasks yet!`; // Added toLowerCase
      ul.appendChild(msg);
    }
    msg.style.display = "block";
  }
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  // Ensure the date is valid before formatting
  if (isNaN(d.getTime())) {
    return ""; // Return empty string for invalid dates
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}