(function() {
  if (window.ChatEchInitialized) return;
  window.ChatEchInitialized = true;

  const script = document.currentScript;
  const clientId = script.getAttribute('data-client') || 'demo';
  const apiUrl = script.getAttribute('data-api') || 'https://chatech-widget.vercel.app';

  let config = null;
  let isOpen = false;
  let sessionId = localStorage.getItem(`chatech_session_${clientId}`) || null;
  let isLoading = false;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let buttonPos = { right: 24, bottom: 24 };

  function loadConfig(retries = 3) {
    fetch(`${apiUrl}/api/config/${clientId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        config = data;
        initWidget();
      })
      .catch(err => {
        console.error('ChatEch: Error loading config:', err);
        if (retries > 0) {
          setTimeout(() => loadConfig(retries - 1), 2000);
        }
      });
  }

  loadConfig();

  function initWidget() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes chatech-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes chatech-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes chatech-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      #chatech-button:hover {
        transform: scale(1.1) !important;
      }
      #chatech-button.dragging {
        cursor: grabbing !important;
        transform: scale(1.05) !important;
      }
      #chatech-messages::-webkit-scrollbar {
        width: 6px;
      }
      #chatech-messages::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      #chatech-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      #chatech-messages::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      .chatech-message {
        animation: chatech-slide-up 0.3s ease;
      }
      #chatech-input:focus {
        border-color: ${config.primaryColor} !important;
        box-shadow: 0 0 0 3px ${config.primaryColor}20 !important;
      }
      @media (max-width: 480px) {
        #chatech-window {
          width: calc(100vw - 20px) !important;
          height: 400px !important;
          max-height: 400px !important;
          right: 10px !important;
          bottom: 90px !important;
          border-radius: 16px !important;
        }
        #chatech-button {
          width: 65px !important;
          height: 65px !important;
        }
      }
    `;
    document.head.appendChild(style);

    let buttonContent;
    if (config.logoType === 'image') {
      buttonContent = `<img src="${config.logo}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%;" alt="Logo">`;
    } else {
      buttonContent = config.logo || '💬';
    }
    
    const button = document.createElement('div');
    button.id = 'chatech-button';
    button.innerHTML = buttonContent;
    button.style.cssText = `
      position: fixed;
      bottom: ${buttonPos.bottom}px;
      right: ${buttonPos.right}px;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: ${config.logoType === 'image' ? 'transparent' : `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`};
      color: white;
      font-size: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1);
      z-index: 9998;
      transition: transform 0.2s, box-shadow 0.2s;
      animation: chatech-fade-in 0.5s ease;
      user-select: none;
    `;

    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
      if (isOpen) return;
      isDragging = false;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = button.getBoundingClientRect();
      dragOffset.x = clientX - rect.left;
      dragOffset.y = clientY - rect.top;
      
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', onDrag, { passive: false });
      document.addEventListener('touchend', stopDrag);
    }

    function onDrag(e) {
      e.preventDefault();
      isDragging = true;
      button.classList.add('dragging');
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      let newX = window.innerWidth - clientX - (button.offsetWidth - dragOffset.x);
      let newY = window.innerHeight - clientY - (button.offsetHeight - dragOffset.y);
      
      newX = Math.max(10, Math.min(newX, window.innerWidth - button.offsetWidth - 10));
      newY = Math.max(10, Math.min(newY, window.innerHeight - button.offsetHeight - 10));
      
      button.style.right = newX + 'px';
      button.style.bottom = newY + 'px';
      buttonPos.right = newX;
      buttonPos.bottom = newY;
    }

    function stopDrag() {
      button.classList.remove('dragging');
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('touchend', stopDrag);
      
      setTimeout(() => {
        if (!isDragging) {
          toggleChat();
        }
        isDragging = false;
      }, 10);
    }

    const badge = document.createElement('div');
    badge.id = 'chatech-badge';
    badge.textContent = '1';
    badge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      font-size: 12px;
      font-weight: 700;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
    `;
    button.appendChild(badge);

    let headerLogoContent;
    if (config.logoType === 'image') {
      headerLogoContent = `<img src="${config.logo}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" alt="Logo">`;
    } else {
      headerLogoContent = `<div style="font-size: 28px;">${config.logo || '💬'}</div>`;
    }

    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatech-window';
    chatWindow.style.cssText = `
      position: fixed;
      bottom: ${buttonPos.bottom + 80}px;
      right: ${buttonPos.right}px;
      width: 350px;
      height: 450px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      animation: chatech-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    chatWindow.innerHTML = `
      <div style="background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
          ${headerLogoContent}
          <div>
            <h3 style="margin: 0 0 2px 0; font-size: 16px; font-weight: 600; letter-spacing: -0.3px;">${config.name}</h3>
            <div style="display: flex; align-items: center; gap: 5px; opacity: 0.95;">
              <div style="width: 7px; height: 7px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);"></div>
              <small style="font-size: 12px; font-weight: 500;">En línea</small>
            </div>
          </div>
        </div>
        <button id="chatech-close" style="background: rgba(255,255,255,0.15); border: none; color: white; font-size: 20px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0;">✕</button>
      </div>
      <div id="chatech-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);"></div>
      <div id="chatech-typing" style="display: none; padding: 10px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <div style="display: flex; gap: 4px; align-items: center;">
          <div style="width: 7px; height: 7px; border-radius: 50%; background: ${config.primaryColor}; animation: chatech-pulse 1.4s infinite;"></div>
          <div style="width: 7px; height: 7px; border-radius: 50%; background: ${config.primaryColor}; animation: chatech-pulse 1.4s infinite 0.2s;"></div>
          <div style="width: 7px; height: 7px; border-radius: 50%; background: ${config.primaryColor}; animation: chatech-pulse 1.4s infinite 0.4s;"></div>
          <span style="margin-left: 8px; font-size: 12px; color: #64748b;">Escribiendo...</span>
        </div>
      </div>
      <div style="padding: 12px 16px; background: white; border-top: 1px solid #e2e8f0;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input id="chatech-input" type="text" placeholder="Escribe tu mensaje..." style="flex: 1; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 20px; outline: none; font-size: 14px; font-family: inherit; transition: all 0.2s; background: #f8fafc;" />
          <button id="chatech-send" style="background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%); color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 14px; white-space: nowrap; box-shadow: 0 4px 12px ${config.primaryColor}40; transition: all 0.2s; flex-shrink: 0;">Enviar</button>
        </div>
        <div style="margin-top: 8px; text-align: center;">
          <small style="color: #94a3b8; font-size: 10px;">Powered by <strong>ChatEch</strong></small>
        </div>
      </div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(chatWindow);

    setTimeout(() => {
      addMessage('bot', config.welcomeMessage);
      if (!isOpen) {
        badge.style.display = 'flex';
      }
    }, 500);

    document.getElementById('chatech-close').onclick = toggleChat;
    document.getElementById('chatech-close').onmouseover = function() {
      this.style.background = 'rgba(255,255,255,0.25)';
    };
    document.getElementById('chatech-close').onmouseout = function() {
      this.style.background = 'rgba(255,255,255,0.15)';
    };

    const sendBtn = document.getElementById('chatech-send');
    sendBtn.onclick = sendMessage;
    sendBtn.onmouseover = function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = `0 6px 16px ${config.primaryColor}50`;
    };
    sendBtn.onmouseout = function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = `0 4px 12px ${config.primaryColor}40`;
    };

    document.getElementById('chatech-input').onkeypress = (e) => {
      if (e.key === 'Enter') sendMessage();
    };
  }

  function toggleChat() {
    if (isDragging) return;
    isOpen = !isOpen;
    const chatWindow = document.getElementById('chatech-window');
    const badge = document.getElementById('chatech-badge');
    
    if (isOpen) {
      chatWindow.style.right = buttonPos.right + 'px';
      chatWindow.style.bottom = (buttonPos.bottom + 80) + 'px';
      chatWindow.style.display = 'flex';
      badge.style.display = 'none';
      setTimeout(() => {
        document.getElementById('chatech-input')?.focus();
      }, 100);
    } else {
      chatWindow.style.display = 'none';
    }
  }

  function sendMessage() {
    const input = document.getElementById('chatech-input');
    const message = input.value.trim();
    if (!message || isLoading) return;

    isLoading = true;
    addMessage('user', message);
    input.value = '';

    document.getElementById('chatech-typing').style.display = 'block';
    document.getElementById('chatech-send').disabled = true;

    fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        clientId,
        sessionId,
        pageUrl: window.location.href
      })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        document.getElementById('chatech-typing').style.display = 'none';
        document.getElementById('chatech-send').disabled = false;
        isLoading = false;
        
        if (data.botResponse) {
          if (data.sessionId) {
            sessionId = data.sessionId;
            try {
              localStorage.setItem(`chatech_session_${clientId}`, sessionId);
            } catch (e) {}
          }
          
          setTimeout(() => {
            addMessage('bot', data.botResponse);
          }, 300);
        } else if (data.error) {
          addMessage('bot', data.error);
        }
      })
      .catch(err => {
        document.getElementById('chatech-typing').style.display = 'none';
        document.getElementById('chatech-send').disabled = false;
        isLoading = false;
        addMessage('bot', 'Lo siento, hubo un error de conexión. Por favor intenta de nuevo.');
        console.error('ChatEch error:', err);
      });
  }

  function addMessage(role, content) {
    const messagesDiv = document.getElementById('chatech-messages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatech-message';
    
    if (role === 'user') {
      messageDiv.style.cssText = `
        background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
        color: white;
        padding: 10px 14px;
        border-radius: 16px;
        border-bottom-right-radius: 4px;
        margin-bottom: 10px;
        margin-left: auto;
        max-width: 80%;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
        box-shadow: 0 2px 8px ${config.primaryColor}30;
      `;
    } else {
      messageDiv.style.cssText = `
        background: white;
        color: #1e293b;
        padding: 10px 14px;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        margin-bottom: 10px;
        max-width: 80%;
        word-wrap: break-word;
        white-space: pre-line;
        font-size: 14px;
        line-height: 1.4;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        border: 1px solid #e2e8f0;
      `;
    }
    
    messageDiv.textContent = content;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
})();
