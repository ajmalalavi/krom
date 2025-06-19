document.querySelectorAll('.km-settings')[0].onclick = function () {
  chrome.tabs.create({ url: 'chrome://bookmarks/' })
};

let items = [];
chrome.bookmarks.getTree((tree) => {
  getBookmarks(tree[0].children, 'main');
  displayBookmarks();
});

// Show/Hide Items based on tag
function kmItems() {
  const tag = document.querySelectorAll('.km-menu input:checked')[0].value;
  [...document.getElementsByClassName('km-item')].forEach(item => {
    if (tag != 'all') {
      item.classList.add('hide');
    } else {
      item.classList.remove('hide');
    }
  });
  [...document.querySelectorAll(`[data-tag="${tag}"`)].forEach(item => {
    item.classList.remove('hide');
  });
}

// Recursively get the bookmarks
function getBookmarks(nodes, parent) {
  for (const node of nodes) {
    // If the node is a bookmark, create a list item and append it to the parent node
    if (node.url) {
      if (items[parent] == undefined) {
        items[parent] = [];
      }
      items[parent].push(node);
    }

    // If the node has children, recursively display them
    if (node.children) {
      if (node.parentId == 0) {
        node.title = 'main';
      }
      if (items[node.title] == undefined) {
        items[node.title] = [];
      }
      getBookmarks(node.children, node.title);
    }
  }
}

// Display bookmarks
async function displayBookmarks() {
  // Store thumbnails in storage
  const storage = chrome.storage.local;
  const menu = document.getElementsByClassName('km-menu')[0];
  for (const item in items) {
    if (item != 'main') {
      let title_min = item.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      menu.innerHTML += `
      <input type="radio" name="km-input" id="km-input-${title_min}" value="${item}">
      <label for="km-input-${title_min}">${item}</label>
      `;
    }
    for (const i in items[item]) {
      let domain = (new URL(items[item][i].url));
      let url = `${domain.protocol}//${domain.hostname}`;
      let key = domain.hostname.replaceAll('.', '_');
      let dataUrl = false;
      await storage.get([key]).then((result) => {
        dataUrl = result[key];
        if (dataUrl != undefined) {
          addItem(items[item][i], item, dataUrl, domain.hostname[0]);
        } else {
          toDataURL(url, async function (dataUrl) {
            await storage.set({ [key]: dataUrl });
            addItem(items[item][i], item, dataUrl, domain.hostname[0]);
          });
        }
      });
    }
  }
  [...document.querySelectorAll('.km-menu input')].forEach(input => {
    input.onchange = () => { kmItems() };
  });
  kmItems();
  kmDragDrop();
}

// Create icon image
function toDataURL(url, callback) {
  url = `https://logo.clearbit.com/${url}`;
  var xhr = new XMLHttpRequest();
  xhr.onload = () => {
    var reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
    }
    reader.readAsDataURL(xhr.response);
  };
  xhr.addEventListener("error", () => {
    callback(false);
  });
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

// Create icon letter
function iconLetter(char) {
  const colors = [
    ['#ad138d', 'white'],
    ['#8a11bc', 'white'],
    ['#0000b5', 'white'],
    ['#007a8e', 'white'],
    ['#900c73', 'white'],
  ];
  let color = Math.floor(Math.random() * colors.length);
  return `<div class="km-icon" style="background-color:${colors[color][0]};color:${colors[color][1]}">${char}</div>`;
}

// Add item to folder and search list
const folder = document.getElementsByClassName('km-folder')[0];
const searchList = document.getElementsByClassName('km-list')[0];
function addItem(item, tag, dataUrl, char) {
  if (dataUrl) {
    icon = `<div class="km-icon" style="background-image:url('${dataUrl}')"></div>`;
  } else {
    icon = iconLetter(char);
  }
  folder.innerHTML += `
  <a class="km-item hide" draggable="true" data-tag="${tag}" data-index="${item.index}" data-parent="${item.parentId}" data-id="${item.id}" href="${item.url}">
    ${icon}
    <div class="km-label">${item.title}</div>
  </a>
  `;
  tag = (tag != 'main') ? `${tag} &#187; ` : ``;
  searchList.innerHTML += `
  <a href="${item.url}">
    ${icon}
    <span>${tag}${item.title}</span>
  </a>
  `;
}

// filter search
const search = document.querySelectorAll('[name="search"]')[0];
search.onkeyup = () => { searchFilter(); };
search.onfocus = () => { searchFilter(); };
function searchFilter() {
  let searchitems = document.querySelectorAll('.km-list a');
  let searchValue = search.value.toLowerCase();
  let count = 0;
  searchitems.forEach(function (searchitem) {
    let title = searchitem.getElementsByTagName('span')[0].innerText.toLowerCase();
    let href = searchitem.href.toLowerCase();
    if (title.search(searchValue) < 0 && href.search(searchValue) < 0) {
      searchitem.style.display = 'none';
    } else {
      searchitem.style.display = 'flex';
      count++;
    }
  });
  document.getElementsByClassName("km-noresult")[0].style.display = (count > 0) ? 'none' : 'block';
}

document.onkeydown = (e) => {
  if (e.key === "Escape" || e.key === "Esc") {
    search.value = '';
    search.blur();
  }
};


// Drag and Drop
function kmDragDrop() {
  let dragitems = document.querySelectorAll('.km-folder .km-item');
  dragitems.forEach(function (dragitem) {
    dragitem.addEventListener('dragstart', handleDragStart, false);
    dragitem.addEventListener('dragenter', handleDragEnter, false);
    dragitem.addEventListener('dragover', handleDragOver, false);
    dragitem.addEventListener('drop', handleDrop, false);
    dragitem.addEventListener('dragend', handleDragEnd, false);
    dragitem.addEventListener('drag', handleDrag, false);
  });
}

var dragSrcEl = null;
var dragSrcId = null;

function handleDragStart(e) {
  dragSrcEl = this;
  dragSrcId = this.dataset.id;
  e.target.classList.add("dragging");
}

function handleDragEnter(e) {
  if (this != dragSrcEl) {
    this.classList.add("dropzone");
  }
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation(); // stops the browser from redirecting.
  }
  if (dragSrcEl != this) {
    this.classList.remove('dropzone');
    let dragDstId = this.dataset.id;
    let dstIndex = parseInt(this.dataset.index);
    let srcIndex = parseInt(dragSrcEl.dataset.index);
    let dstParentId = this.dataset.parent;
    let srcParentId = dragSrcEl.dataset.parent;
    if (dstParentId != srcParentId) {
      chrome.bookmarks.move(dragSrcId, { 'index': dstIndex, 'parentId': dstParentId });
      chrome.bookmarks.move(dragDstId, { 'index': srcIndex, 'parentId': srcParentId });
      let tempSrc = dragSrcEl.cloneNode(true);
      let tempDst = this.cloneNode(true);
      let tempTag = tempSrc.dataset.tag;
      tempSrc.dataset.tag = tempDst.dataset.tag;
      tempDst.dataset.tag = tempTag;
      this.replaceWith(tempSrc);
      dragSrcEl.replaceWith(tempDst);
    } else {
      let parent = this.parentNode;
      let tag = this.dataset.tag;
      if (Array.prototype.indexOf.call(parent.children, dragSrcEl) > Array.prototype.indexOf.call(parent.children, this)) {
        this.parentNode.insertBefore(dragSrcEl, this);
      } else {
        this.parentNode.insertBefore(dragSrcEl, this.nextSibling);
      }
      let i = 0;
      [...document.querySelectorAll(`[data-tag="${tag}"`)].forEach(item => {
        chrome.bookmarks.move(item.dataset.id, { 'index': parseInt(i++) });
      });
    }
    kmItems();
    kmDragDrop();
  }
  return false;
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
}

function handleDrag(e) {
  let currentEl = document.elementFromPoint(e.clientX, e.clientY);
  if (currentEl.tagName == 'LABEL') {
    currentEl.click()
  }
  // Remove border when not a dropzone
  if (
    !currentEl.classList.contains('km-item') &&
    !currentEl.parentNode.classList.contains('km-item')
  ) {
    [...document.getElementsByClassName('dropzone')].forEach(item => {
      item.classList.remove('dropzone');
    });
  }
}