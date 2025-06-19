const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");
const totalCount = document.getElementById("total-count");
const completedCount = document.getElementById("completed-count");

function addTask() {
    if (inputBox.value.trim() === '') {
        alert("You must write something!");
        return;
    }

    let li = document.createElement("li");
    li.innerHTML = inputBox.value;
    listContainer.appendChild(li);

    let span = document.createElement("span");
    span.innerHTML = "\u00d7";
    li.appendChild(span);

    inputBox.value = "";
    saveData();
    updateCount();
}

listContainer.addEventListener("click", function (e) {
    if (e.target.tagName === "LI") {
        e.target.classList.toggle("checked");
    } else if (e.target.tagName === "SPAN") {
        e.target.parentElement.remove();
    }
    saveData();
    updateCount();
}, false);

function saveData() {
    localStorage.setItem("data", listContainer.innerHTML);
}

function showTask() {
    listContainer.innerHTML = localStorage.getItem("data");
    updateCount();
}

function updateCount() {
    const total = listContainer.querySelectorAll("li").length;
    const completed = listContainer.querySelectorAll("li.checked").length;
    totalCount.textContent = total;
    completedCount.textContent = completed;
}

function clearCompleted() {
    const completedTasks = listContainer.querySelectorAll("li.checked");
    completedTasks.forEach(task => task.remove());
    saveData();
    updateCount();
}

function clearAll() {
    listContainer.innerHTML = "";
    saveData();
    updateCount();
}

showTask();
