// Initialize global variable
let currentEditingRow = null;
const GAS_BASE_URL = 
"https://script.google.com/macros/s/AKfycbySnLTNYChFM71PIu4GjMsEqXmz_3x4dRtEAEv8Re6lqtUhVFmBLnJX3z5wwjTEtZNU/exec";

// Initialize Materialize and load data on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  M.AutoInit();
  loadData();
  updateTodayDate();
});

// Update today's date in the specified format
function updateTodayDate() {
  const today = new Date();
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  };
  document.getElementById('today-date').innerHTML = 
    `<h5>${today.toLocaleDateString('ja-JP', options)}</h5>`;
}

// Load task data from Google Script
async function loadData() {
    try {
      const response = await fetch(`${GAS_BASE_URL}?action=getTodaysTasks`);
      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`);
      }
  
      // レスポンス全体をテキスト形式でログに出力
      const rawData = await response.text();
      console.log("デバッグ: レスポンスの生データ", rawData);
  
      // JSONとしてパース
      const data = JSON.parse(rawData);
      console.log("デバッグ: JSONとして解析したデータ", data);
  
      renderTable(data);
    } catch (error) {
      console.error("デバッグ: エラー内容", error);
      M.toast({ html: `エラーが発生しました: ${error.message}`, classes: 'red' });
    }
  }
  
  

// Render the task table
function renderTable(data) {
  const headers = data[0];
  const rows = data.slice(1);

  let html = `
    <table class="striped">
      <thead>
        <tr>
          ${headers.map(header => `<th>${header}</th>`).join('')}
          <th>アクション</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((row, index) => {
    const [task, status, completionTime, note] = row;
    const statusClass = status === '完了' ? 'completed' : '';
    html += `
      <tr class="${statusClass}">
        <td>${task}</td>
        <td>${status}</td>
        <td>${completionTime || ''}</td>
        <td>
          <div class="note-content">
            ${note || ''}
            <a class="btn-floating btn-small waves-effect waves-light blue edit-note" 
               onclick="openNoteModal(${index}, '${note || ''}')">
              <i class="material-icons">edit</i>
            </a>
          </div>
        </td>
        <td>
          <button 
            onclick="toggleStatus(${index}, '${status === '完了' ? '未完了' : '完了'}')"
            class="btn-small waves-effect waves-light ${status === '完了' ? 'red' : 'green'}"
          >
            ${status === '完了' ? '未完了に戻す' : '完了にする'}
          </button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  document.getElementById('table-container').innerHTML = html;
  updateProgress(rows);
}

// Update progress bar and text
function updateProgress(rows) {
  const total = rows.length;
  const completed = rows.filter(row => row[1] === '完了').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('progress-bar').style.width = percentage + '%';
  document.getElementById('progress-text').textContent = 
    `完了: ${completed}/${total} タスク (${percentage}%)`;
}

// Handle errors
function handleError(error) {
  M.toast({ html: `エラーが発生しました: ${error}`, classes: 'red' });
}

// Toggle task status
function toggleStatus(rowIndex, newStatus) {
  google.script.run
    .withSuccessHandler((data) => {
      renderTable(data);
      M.toast({ html: `タスクを${newStatus}に更新しました`, classes: 'green' });
    })
    .withFailureHandler(handleError)
    .updateTaskStatus(rowIndex, newStatus);
}

// Open note modal for editing
function openNoteModal(rowIndex, currentNote) {
  currentEditingRow = rowIndex;
  const noteText = document.getElementById('noteText');
  noteText.value = currentNote;
  M.textareaAutoResize(noteText);
  M.updateTextFields();

  const modal = M.Modal.getInstance(document.getElementById('noteModal'));
  modal.open();
}

// Save updated note
function saveNote() {
  const note = document.getElementById('noteText').value;

  google.script.run
    .withSuccessHandler((data) => {
      renderTable(data);
      M.toast({ html: 'メモを更新しました', classes: 'green' });
      const modal = M.Modal.getInstance(document.getElementById('noteModal'));
      modal.close();
    })
    .withFailureHandler(handleError)
    .updateTaskNote(currentEditingRow, note);
}

// Submit email to retrieve task checklist
function submitEmail() {
  const email = document.getElementById("emailInput").value;
  if (!email) {
    M.toast({ html: "メールアドレスを入力してください", classes: "red" });
    return;
  }

  google.script.run
    .withSuccessHandler((data) => {
      document.getElementById("email-form-container").style.display = "none";
      document.getElementById("table-container").style.display = "block";
      document.getElementById("progress-container").style.display = "block";
      renderTable(data);
    })
    .withFailureHandler((error) => {
      M.toast({ html: `エラーが発生しました: ${error.message}`, classes: "red" });
    })
    .getTasksByEmail(email);
}

