// 选项卡管理
let tabs = []; // 用于存储选项卡对象
let currentTab = null; // 当前选中的选项卡

document.addEventListener('DOMContentLoaded', function() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const timerDisplay = document.getElementById('timerDisplay');
  let timerInterval;
  let isPaused = localStorage.getItem('isPaused') === 'true'; // Restore pause state
  let remainingTime = parseInt(localStorage.getItem('remainingTime')) || 0;

  // Listen for timer updates
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      console.log('Received event data:', request); // Log the entire event data
      const { isRunning, remainingTime } = request;
      console.log(`Received message: Timer is ${isRunning ? 'running' : 'stopped'}, remaining time: ${remainingTime}`);
      if (typeof remainingTime === 'number') {
        if (remainingTime < 0) {
          remainingTime = 0; // Prevent negative time
          clearInterval(timerInterval);
          showNotification('计时器结束');
          chrome.runtime.sendMessage({ action: 'restartTimer' });
        }
        updateTimerDisplay(remainingTime);
      } else {
        console.error('Received undefined remainingTime');
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Start timer button event
  document.getElementById('startTimerButton').addEventListener('click', () => {
    const timerSelect = document.getElementById('timerSelect');
    const time = parseInt(timerSelect.value, 10) * 60 || 0; // Get selected time, default to 0 if NaN
    updateTimerDisplay(time)
    chrome.runtime.sendMessage({ action: 'startTimer', time });
    console.log('Sent startTimer action with time:', time);
  });

  // Pause/Resume timer button event
  document.getElementById('pauseTimerButton').addEventListener('click', () => {
    if (isPaused) {
      chrome.runtime.sendMessage({ action: 'resumeTimer'});
      console.log('Sent resumeTimer action to resume with remaining time:', remainingTime);
    } else {
      chrome.runtime.sendMessage({ action: 'pauseTimer' });
      console.log('Sent pauseTimer action');
      
    }
    isPaused = !isPaused; // Toggle the pause state
  });

  // Restart timer button event
  document.getElementById('resetTimerButton').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'restartTimer' });
    console.log('Sent restartTimer action');
  });

  function updateTimerDisplay(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  // 保存当前选项卡的内容
  function saveCurrentContent(tabId) {
    const tabKey = `tabContent_${tabId}`; // 使用 tabId 作为键名
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
      tab_value_saved = tab.buttonElement.textContent;
    } else {
      console.warn(`Tab with id ${tabId} not found.`);
    }
    const content = {
      inputText: document.getElementById('inputText').value || '',
      emailInputText: document.getElementById('emailInputText').value || '',
      outputText: document.getElementById('outputText').value || '',
      emailOutput: document.getElementById('emailOutput').value || '',
      backgroundTextBox: document.getElementById('backgroundTextBox').value || '',
      intentionTextBox: document.getElementById('intentionTextBox').value || '',
      editBox: document.getElementById('editBox').value || '',
      casetype: document.getElementById('casetype').value || '',
      tab_value: tab_value_saved,
    };
    localStorage.setItem(tabKey, JSON.stringify(content)); // 存储到 localStorage
  }

  // 恢复当前选项卡的内容
  function loadCurrentContent(tabId) {
    const tabKey = `tabContent_${tabId}`; // 使用 tabId 作为键名
    const savedContent = localStorage.getItem(tabKey);
     
    if (savedContent) {
      const content = JSON.parse(savedContent);
      document.getElementById('inputText').value = content.inputText || '';
      document.getElementById('emailInputText').value = content.emailInputText || '';
      document.getElementById('outputText').value = content.outputText || '';
      document.getElementById('emailOutput').value = content.emailOutput || '';
      document.getElementById('backgroundTextBox').value = content.backgroundTextBox || '';
      document.getElementById('intentionTextBox').value = content.intentionTextBox || '';
      document.getElementById('editBox').value = content.editBox || '';
      document.getElementById('casetype').value = content.casetype || '';
       // 根据 tabId 查找选项卡对象并更新其按钮文本
      const tab = tabs.find(tab => tab.id === tabId);
      if (tab) {
        tab.buttonElement.textContent = content.tab_value;
      } else {
        console.warn(`Tab with id ${tabId} not found.`);
      }
    }
  }

  // 获取下一个可用的 tabId
  function getNextAvailableId() {
    let id = 1;
    while (tabs.some(tab => tab.id === id)) {
      id++;
    }
    return id;
  }



  // 创建新的选项卡
  function createTab(tabNumber = getNextAvailableId()) {
    if (currentTab) {
      // 在创建新选项卡前保存当前选项卡内容
      saveCurrentContent(currentTab.id);
    }
    const tabObject = {
      id: tabNumber,
      tabElement: null,
      buttonElement: null,
    };
    
    const newTab = document.createElement('div'); // 使用 div 包裹按钮和关闭按钮
    newTab.className = 'tab'; // 为新选项卡设置类名

    const tabButton = document.createElement('button');
    tabButton.className = 'switch-button';
    tabButton.textContent = `Page ${tabNumber}`; // 设置选项卡名称
    tabButton.dataset.tab = `page${tabNumber}`; // 设置选项卡数据属性

    const closeButton = document.createElement('button'); // 创建关闭按钮
    closeButton.textContent = '×'; // 设置关闭按钮文本
    closeButton.className = 'close-button'; // 设置关闭按钮类名
    closeButton.addEventListener('click', function() {
      if (tabs.length === 1) {
        alert("Cannot delete the last tab."); // 阻止删除最后一个选项卡
        return;
      }
      if (currentTab === tabObject) currentTab = null; // 重置当前选项卡
      localStorage.removeItem(`tabContent_${tabObject.id}`); // 删除保存内容
      tabs = tabs.filter(tab => tab.id !== tabObject.id); // 从数组中移除选项卡对象
      newTab.remove(); // 移除选项卡
      if (tabs.length > 0) {
        currentTab = tabs[0];
        loadCurrentContent(currentTab.id); // 加载第一个选项卡内容
        // currentTab.buttonElement.classList.add('active'); // 让当前点击的按钮变成 active
      }
    });

    // tabButton.addEventListener('click', function() {
    //   if (currentTab) saveCurrentContent(currentTab.id); // 保存当前选项卡内容
    //   loadCurrentContent(tabObject.id); // 加载新选项卡内容
    //   currentTab = tabObject; // 更新当前选项卡
    // });
    tabButton.addEventListener('click', function () {
      if (currentTab) {
          saveCurrentContent(currentTab.id); // 保存当前选项卡内容
          currentTab.buttonElement.classList.remove('active'); // 移除原选项卡的 active 状态
      }
  
      loadCurrentContent(tabObject.id); // 加载新选项卡内容
      tabObject.buttonElement.classList.add('active'); // 让当前点击的按钮变成 active
      currentTab = tabObject; // 更新当前选项卡
  });

    newTab.appendChild(tabButton); // 将选项卡按钮添加到选项卡容器
    newTab.appendChild(closeButton); // 将关闭按钮添加到选项卡容器
    document.getElementById('tab-container').appendChild(newTab); // 添加到选项卡容器

    tabObject.tabElement = newTab;
    tabObject.buttonElement = tabButton;
    tabs.push(tabObject);
    currentTab = tabObject; // 设置为当前选项卡
    
    // 清空新选项卡内容
    document.getElementById('inputText').value = '';
    document.getElementById('emailInputText').value = '';
    document.getElementById('outputText').value = '';
    document.getElementById('emailOutput').value = '';
    document.getElementById('backgroundTextBox').value = '';
    document.getElementById('intentionTextBox').value = '';
    document.getElementById('editBox').value = '';
  }

  // 处理新选项卡的创建
  document.querySelector('.tab-button[data-tab="new"]').addEventListener('click', function() {
    createTab(); // 创建新选项卡
  });

  // 加载历史选项卡和内容
  // 加载历史选项卡和内容
function loadSavedTabs() {
  const tabKeys = Object.keys(localStorage).filter(key => key.startsWith('tabContent_'));
  
  if (tabKeys.length === 0) {
    createTab(1); // 如果没有保存的选项卡，创建默认的 tab1
    loadCurrentContent(1); // 加载默认选项卡内容
  } else {
    tabKeys.forEach(key => {
      const tabId = parseInt(key.split('_')[1], 10); // 提取 tabId，指定基数为10
      createTab(tabId); // 创建选项卡
      loadCurrentContent(tabId); // 加载每个选项卡的内容
      console.log(`Loaded content for tabId: ${tabId}`); // 调试日志
    });
  }
  
  // 确保 currentTab 被正确设置为第一个加载的选项卡
  if (tabs.length > 0) {
    currentTab = tabs[0];  // 将 currentTab 设置为第一个选项卡
    loadCurrentContent(currentTab.id); // 加载第一个选项卡的内容
    currentTab.buttonElement.classList.add('active')
  }
}


  // 初始化
  loadSavedTabs();
  document.getElementById('processButton').addEventListener('click', function() {
    if (currentTab) {
      saveCurrentContent(currentTab.id);
    }
  });
});  
  const inputText = document.getElementById('inputText');
  const emailInputText = document.getElementById('emailInputText');
  const outputText = document.getElementById('outputText');
  const emailOutput = document.getElementById('emailOutput');
  const copyButtons = document.querySelectorAll('.copyButton');
  const clearButton = document.getElementById('clearButton');
  const groupSelect = document.getElementById('groupSelect');
  const calculatedEmail = document.getElementById('calculatedEmail');
  const backgroundTextBox = document.getElementById('backgroundTextBox');
  const intentionTextBox = document.getElementById('intentionTextBox');
  const timerSelect = document.getElementById('timerSelect');
  const startTimerButton = document.getElementById('startTimerButton');
  const timerDisplay = document.getElementById('timerDisplay');
  const editBox = document.getElementById('editBox');
  const caseType = document.getElementById('casetype'); // Get the casetype textarea

  // 初始化组别为0
  if (groupSelect) {
    groupSelect.value = '0';
    groupSelect.dispatchEvent(new Event('change'));
  }

  // Load saved data
  if (inputText) {
    inputText.value = localStorage.getItem('inputText') || '';
  }
  if (emailInputText) {
    emailInputText.value = localStorage.getItem('emailInputText') || '';
  }

  // Save data on input change
  const saveInputData = (element, key) => {
    if (element) {
      element.addEventListener('input', () => {
        localStorage.setItem(key, element.value);
      });
    }
  };
  saveInputData(inputText, 'inputText');
  saveInputData(emailInputText, 'emailInputText');

  // Function to update the editBox content
  function updateEditBox() {
    const inputValues = inputText.value.split('\t');
    const existingContent = editBox.value.split('\n').slice(1).join('\n'); // Preserve content after the first line
    if (inputValues.length > 2) {
      const teacherName = inputValues[1] || '老师';
      const studentName = inputValues[2] || '学生';
      editBox.value = `${teacherName}老师您好，${studentName}的审核意见如下：\n${existingContent}`;
    } else {
      editBox.value = existingContent; // Preserve existing content if not enough data
    }
  }

  // Process text and update editBox when the button is clicked
  document.getElementById('processButton').addEventListener('click', function() {
    const [processedText, groupmail] = extractInformation(inputText.value);
    const emails = extractEmails(emailInputText.value);
    outputText.value = processedText;
    emailOutput.value = emails.join('\n');

    // Update the editBox with the formatted text
    updateEditBox();


    // Debugging: Log the groupmail to ensure it's correct
    console.log('Groupmail:', groupmail);

    // Infer group number from groupmail
    // if (groupmail) {
    //   const groupNumber = groupmail.slice(-2);
    //   console.log('Inferred Group Number:', groupNumber);

    //   const number = parseInt(groupNumber, 10);
    //   if (groupSelect.querySelector(`option[value="${number}"]`)) {
    //     groupSelect.value = number;
    //     groupSelect.dispatchEvent(new Event('change'));
    //   } else {
    //     console.warn(`Group number ${number} not found in groupSelect options.`);
    //   }
    // } else {
    //   console.warn('No group number found in groupmail.');
    // }

    // Display list[7] and list[8] in respective text boxes
    const list = emailInputText.value.split('\t');
    if (list.length > 8) {
      const trimSpecialChars = (str) => (str ? str.trim() : '');
      backgroundTextBox.value = trimSpecialChars(list[7]) || '';
      intentionTextBox.value = trimSpecialChars(list[8]) || '';
      caseType.value = trimSpecialChars(list[12]) || '';
    } else {
      console.warn('The input does not contain enough fields.');
    }
    const inputValues = inputText.value.split('\t');
    const studentName = inputValues[2] || '学生'; // Define studentName here
    if (studentName && currentTab) {
      currentTab.buttonElement.textContent = `${studentName}`; // 替换 tabButton 的文字
    }
  });

  // Copy output to clipboard
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const targetTextarea = document.getElementById(targetId);
      navigator.clipboard.writeText(targetTextarea.value).then(() => {
        showNotification(`${targetTextarea.id} copied to clipboard!`);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    });
  });

  // Function to show notification
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#007aff'; // Apple blue
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '12px';
    notification.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    notification.style.zIndex = '1000';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transition = 'opacity 0.5s';
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 2000); // Display for 2 seconds
  }

  // Clear all textareas and reset group selection
  clearButton.addEventListener('click', function() {
    const editBox = document.getElementById('editBox');
    
    // Check if editBox is not empty
    if (editBox.value.trim() !== '') {
      // Show confirmation dialog
      const userConfirmed = confirm('确定要清空编辑框吗？');
      
      // If user confirms, clear the editBox
      if (userConfirmed) {
        editBox.value = '';
      }
    }
    [inputText, emailInputText, outputText, emailOutput, backgroundTextBox, intentionTextBox].forEach(el => el.value = '');
    localStorage.removeItem('inputText');
    localStorage.removeItem('emailInputText');

    // 重置组别为0
    groupSelect.value = '0';
    groupSelect.dispatchEvent(new Event('change'));
  });
  groupSelect.addEventListener('change', function() {
    const groupNumber = parseInt(groupSelect.value, 10);
    const formattedNumber = groupNumber < 10 ? `0${groupNumber}` : groupNumber;
    calculatedEmail.value = `supervisorlist${formattedNumber}@ukuoffer.com`;
  });

  // Trigger the change event on page load to set the initial email
  groupSelect.dispatchEvent(new Event('change'));

  // Assuming these variables are defined somewhere in your code


// Start Timer Button Logic
const startButton = document.getElementById('startTimerButton');
const pauseButton = document.getElementById('pauseTimerButton');
const resetButton = document.getElementById('resetTimerButton');

// Initially hide the pause and reset buttons
pauseButton.style.display = 'none';
resetButton.style.display = 'none';

startButton.addEventListener('click', function() {
  // Show the pause and reset buttons when start is clicked
  pauseButton.style.display = 'inline-block';
  resetButton.style.display = 'inline-block';
  startButton.style.display = 'none';
});

resetButton.addEventListener('click', function() {
  // Optionally hide the pause and reset buttons when reset is clicked
  pauseButton.style.display = 'none';
  resetButton.style.display = 'none';
  startButton.style.display = 'inline-block';
});

  function flashBorder() {
    document.body.classList.add('flash-border');
  }

  function stopFlashing() {
    document.body.classList.remove('flash-border');
  }

  function extractInformation(text) {
    if (!text) {
      return ['输入文本为空', ''];
    };

    const list = text.split('\t');
    if (list.length < 17) { // Ensure the list has enough elements
      return ['输入文本格式不正确', ''];
    };

    // Helper function to safely extract and process names
    const extractName = (text, index) => {
      const nameText = text ? text.split('\t')[index] : '';
      return getNameFromFile(nameText.trim());
    };

    // Extract names from both sources
    const nameFromInput = extractName(list[7], 0);
    const emailText = emailInputText.value || '';
    const nameFromEmail = extractName(emailText, 3);

    const customer_list = emailText.split('\t');

    console.log('List:', list);

    let customer_name_from_emailtext = 'none'; // Initialize outside the if block

    if (customer_list && customer_list[5]) { // Check if customer_list[5] exists
      customer_name_from_emailtext = customer_list[5].trim(); // Call trim() correctly
    }

    console.log('customer:', customer_name_from_emailtext);

    if (customer_name_from_emailtext !== 'none' && customer_name_from_emailtext !== list[2]) {
      return [`客户经理栏与择导栏信息不匹配，左侧是${list[2]}右侧是${customer_name_from_emailtext}，请检查！`, ''];
    };

    // Choose the second name if both are present
    const name = nameFromEmail || nameFromInput;
    const groupmail = list[16].trim();

    // Construct the result string with trimmed variables
    const result = [
      "您好,",
      "",
      `请查收【${(list[2] || '').trim()}】的择导表格，以下为相关信息:`,
      "",
      `择导助理: ${(list[1] || '').trim()}`,
      "",
      `DDL：${(list[3] || '').trim()}`,
      "",
      `审核助理：xhl`,
      "",
      `客户经理：${(name || '').trim()}`,
      "",
      "",
      "Best wishes,"
    ].join('\n');

    return [result.trim(), groupmail];
  }

  function getNameFromFile(text) {
    if (!text) {
      return '';
    }

    const memory = ['Ivy', 'Alvis', 'Alicia', 'Dillon', 'Ellen', 'Liz', 'Larrisa', 'Kyla',
      'kaitlyn', 'Jane', 'Rannie', 'Jimi', 'Richard', 'Lesley', 'Siri', 'jane', 'Shmily',
      'Christine', 'Sebby', 'Ella', 'Kristina', 'Alissia', 'Tori', 'Astrid', 'bea', 'Henry', 'hazel', 'Sammi', 'Arwen'];

    const namePattern = new RegExp(`(${memory.join('|')}|[A-Z][a-z]+)`, 'gi');
    const matches = text.match(namePattern);

    if (matches) {
      for (let match of matches) {
        if (memory.map(name => name.toLowerCase()).includes(match.toLowerCase())) {
          return match;
        }
      }
      return matches[0];
    }
    return '';
  }

  function extractEmails(text) {
    if (!text) {
      return [];
    }

    const list = text.split('\t');
    console.log('List:', list); // Debugging: Log the list to the console

    if (list.length < 2) {
      return [];
    }

    const emailField = list[1].trim();
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = emailField.match(emailRegex) || [];

    return emails.map(email => email.trim());
  }

 // 定义话术内容
  function get_Scripts() {
    const inputValues = inputText.value.split('\t');
    const teacherName = inputValues[1] || '老师';
    const studentName = inputValues[2] || '学生';

    return {
        startWork: '大家好，审核部门上班了，请在择导工作登记问卷：https://zykk1c163u.feishu.cn/share/base/form/shrcnndFvgQYMD0QgAD42LpAiHe 递交审核申请，并在本群通知审核部门，我们将尽快审核您递交的文件。',
        endWork: '我下班了，今日处理工单进展已确认无误，负责工单已发送。',
        passScript: `${teacherName}老师您好，${studentName}审核已经通过，已经发送邮件。`
    };
  }



  // 复制到剪切板的函数
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('复制成功: ' + text);
      showNotification('复制成功! '+text)
    }).catch(err => {
      console.error('复制失败: ', err);
    });
  }
  // 添加事件监听器
  document.getElementById('startWorkButton').addEventListener('click', () => {
      // 获取话术
    let scripts = get_Scripts();
    copyToClipboard(scripts.startWork);
  });

  document.getElementById('endWorkButton').addEventListener('click', () => {
      // 获取话术
    let scripts = get_Scripts();
    copyToClipboard(scripts.endWork);
  });

  document.getElementById('passScriptButton').addEventListener('click', () => {
      // 获取话术
    let scripts = get_Scripts();
    copyToClipboard(scripts.passScript);
  });


  document.getElementById('loginMailButton').addEventListener('click', () => {
    window.open('https://qy.163.com/login/', '_blank');
  });
  


