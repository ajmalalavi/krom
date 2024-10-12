document.querySelectorAll('.km-title svg')[0].onclick = function () {
  chrome.tabs.create({ url: 'chrome://bookmarks/' })
};

let items = [];
chrome.bookmarks.getTree((tree) => {
  getBookmarks(tree[0].children, 'main');
  displayBookmarks();
});

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

// Recursively display the bookmarks
function getBookmarks(nodes, parent) {
  for (const node of nodes) {
    // If the node is a bookmark, create a list item and append it to the parent node
    if (node.url) {
      if (items[parent] == undefined) {
        items[parent] = [];
      }
      items[parent].push({ "title": node.title, "url": node.url });
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

async function displayBookmarks() {
  const storage = chrome.storage.local;
  const menu = document.getElementsByClassName('km-menu')[0];
  const folder = document.getElementsByClassName('km-folder')[0];
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
          addItem(folder, items[item][i].title, items[item][i].url, item, dataUrl, domain.hostname[0]);
        } else {
          toDataURL(url, async function (dataUrl) {
            await storage.set({ [key]: dataUrl });
            addItem(folder, items[item][i].title, items[item][i].url, item, dataUrl, domain.hostname[0]);
          });
        }
      });
    }
  }
  [...document.querySelectorAll('.km-menu input')].forEach(input => {
    input.onchange = function () { kmItems() };
  });
  kmItems();
  kmDragDrop();
}
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

function addItem(folder, title, url, tag, dataUrl, char) {
  if (dataUrl) {
    icon = `<img class="km-icon" src="${dataUrl}">`
  } else {
    icon = iconLetter(char);
  }
  folder.innerHTML += `
  <div class="km-item hide" draggable="true" data-tag="${tag}">
    <a href="${url}">
      ${icon}
      <div class="km-label">${title}</div>
    </a>
  </div>
  `;
}

function kmDragDrop() {
  let dragitems = document.querySelectorAll('.km-folder .km-item');
  dragitems.forEach(function (dragitem) {
    dragitem.addEventListener('dragstart', handleDragStart, false);
    dragitem.addEventListener('dragenter', handleDragEnter, false);
    dragitem.addEventListener('dragover', handleDragOver, false);
    dragitem.addEventListener('dragleave', handleDragLeave, false);
    dragitem.addEventListener('drop', handleDrop, false);
    dragitem.addEventListener('dragend', handleDragEnd, false);
  });
}

var dragSrcEl = null;

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  // this.classList.add('over');
}

function handleDragLeave(e) {
  // this.classList.remove('over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation(); // stops the browser from redirecting.
  }
  if (dragSrcEl != this) {
    dragSrcEl.innerHTML = this.innerHTML;
    this.innerHTML = e.dataTransfer.getData('text/html');
  }
  return false;
}

function handleDragEnd(e) {
  // this.style.opacity = '1';

  items.forEach(function (item) {
    // item.classList.remove('over');
  });

  // TODO: Save bookmarks position
}