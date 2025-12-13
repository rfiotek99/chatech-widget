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
  let hasDragged = false;
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
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes chatech-slide-down {
        from { opacity: 0; transform: translateY(-10px); }
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
      #chatech-button {
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      #chatech-button:hover {
        transform: scale(1.08) !important;
      }
      #chatech-button.dragging {
        cursor: grabbing !important;
        transform: scale(1.05) !important;
        box-shadow: 0 12px 32px rgba(0,0,0,0.2) !important;
      }
      #chatech-messages::-webkit-scrollbar {
        width: 5px;
      }
      #chatech-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      #chatech-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      .chatech-message {
        animation: chatech-fade-in 0.2s ease;
      }
      #chatech-input:focus {
        border-color: ${config.primaryColor} !important;
        box-shadow: 0 0 0 3px ${config.primaryColor}20 !important;
      }
      @media (max-width: 480px) {
        #chatech-window {
          width: calc(100vw - 20px) !important;
          height: 380px !important;
          max-height: 380px !important;
          left: 10px !important;
          right: 10px !important;
        }
        #chatech-button {
          width: 60px !important;
          height: 60px !important;
        }
      }
    `;
    document.head.appendChild(style);

    let buttonContent;
    if (config.logoType === 'image') {
      buttonContent = `<img src="${config.logo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; pointer-events: none;" alt="Logo">`;
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
      width: 65px;
      height: 65px;
      border-radius: 50%;
      background: ${config.logoType === 'image' ? 'transparent' : `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`};
      color: white;
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      user-select: none;
    `;

    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
      hasDragged = false;
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = button.getBoundingClientRect();
      dragOffset.x = clientX - rect.left;
      dragOffset.y = clientY - rect.top;
      
      button.classList.add('dragging');
      
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', onDrag, { passive: false });
      document.addEventListener('touchend', stopDrag);
    }

    function onDrag(e) {
      if (!isDragging) return;
      e.preventDefault();
      hasDragged = true;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      let newRight = window.innerWidth - clientX - (button.offsetWidth - dragOffset.x);
      let newBottom = window.innerHeight - clientY - (button.offsetHeight - dragOffset.y);
      
      newRight = Math.max(10, Math.min(newRight, window.innerWidth - button.offsetWidth - 10));
      newBottom = Math.max(10, Math.min(newBottom, window.innerHeight - button.offsetHeight - 10));
      
      button.style.right = newRight + 'px';
      button.style.bottom = newBottom + 'px';
      buttonPos.right = newRight;
      buttonPos.bottom = newBottom;
      
      // Mover chat en tiempo real si está abierto
      if (isOpen) {
        updateChatPosition();
      }
    }

    function stopDrag() {
      isDragging = false;
      button.classList.remove('dragging');
      
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('touchend', stopDrag);
      
      // Solo toggle si no se arrastró
      if (!hasDragged) {
        toggleChat();
      }
    }

    const badge = document.createElement('div');
    badge.id = 'chatech-badge';
    badge.textContent = '1';
    badge.style.cssText = `
      position: absolute;
      top: -2px;
      right: -2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      pointer-events: none;
    `;
    button.appendChild(badge);

    let headerLogoContent;
    if (config.logoType === 'image') {
      headerLogoContent = `<img src="${config.logo}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 50%;" alt="Logo">`;
    } else {
      headerLogoContent = `<div style="font-size: 24px;">${config.logo || '💬'}</div>`;
    }

    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatech-window';
    chatWindow.style.cssText = `
      position: fixed;
      width: 340px;
      height: 420px;
      max-height: calc(100vh - 100px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    `;

    chatWindow.innerHTML = `
      <div style="background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%); color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${headerLogoContent}
          <div>
            <div style="font-size: 15px; font-weight: 600;">${config.name}</div>
            <div style="display: flex; align-items: center; gap: 5px; opacity: 0.9;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: #4ade80;"></div>
              <span style="font-size: 11px;">En línea</span>
            </div>
          </div>
        </div>
        <button id="chatech-close" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>
      <div id="chatech-messages" style="flex: 1; overflow-y: auto; padding: 14px; background: #f8fafc;"></div>
      <div id="chatech-typing" style="display: none; padding: 8px 14px; background: #f1f5f9;">
        <div style="display: flex; gap: 4px; align-items: center;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${config.primaryColor}; animation: chatech-pulse 1.4s infinite;"></div>
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${config.primaryColor}; animation: chatech-pulse 1.4s infinite 0.2s;"></div>
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${config.primaryColor}; animation: chatech-pulse 1.4s infinite 0.4s;"></div>
          <span style="margin-left: 6px; font-size: 12px; color: #64748b;">Escribiendo...</span>
        </div>
      </div>
      <div style="padding: 12px; background: white; border-top: 1px solid #e2e8f0;">
        <div style="display: flex; gap: 8px;">
          <input id="chatech-input" type="text" placeholder="Escribe tu mensaje..." style="flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 20px; outline: none; font-size: 14px; background: #f8fafc;" />
          <button id="chatech-send" style="background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%); color: white; border: none; padding: 10px 18px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 13px;">Enviar</button>
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

    document.getElementById('chatech-close').onclick = () => toggleChat();
    document.getElementById('chatech-send').onclick = sendMessage;
    document.getElementById('chatech-input').onkeypress = (e) => {
      if (e.key === 'Enter') sendMessage();
    };
  }

  function updateChatPosition() {
    const chatWindow = document.getElementById('chatech-window');
    const button = document.getElementById('chatech-button');
    if (!chatWindow || !button) return;
    
    const chatHeight = 420;
    const chatWidth = 340;
    const buttonHeight = 65;
    const margin = 10;
    
    // Determinar si el chat va arriba o abajo del botón
    const spaceAbove = window.innerHeight - buttonPos.bottom - buttonHeight;
    const spaceBelow = buttonPos.bottom;
    
    let chatBottom, chatRight;
    
    if (spaceAbove >= chatHeight + margin) {
      // Chat arriba del botón
      chatBottom = buttonPos.bottom + buttonHeight + margin;
      chatWindow.style.animation = 'chatech-slide-up 0.2s ease';
    } else if (spaceBelow >= chatHeight + margin) {
      // Chat abajo del botón
      chatBottom = buttonPos.bottom - chatHeight - margin;
      chatWindow.style.animation = 'chatech-slide-down 0.2s ease';
    } else {
      // Centrar verticalmente
      chatBottom = Math.max(margin, (window.innerHeight - chatHeight) / 2);
      chatWindow.style.animation = 'chatech-fade-in 0.2s ease';
    }
    
    // Ajustar horizontal
    chatRight = buttonPos.right;
    if (chatRight + chatWidth > window.innerWidth - margin) {
      chatRight = window.innerWidth - chatWidth - margin;
    }
    if (chatRight < margin) {
      chatRight = margin;
    }
    
    chatWindow.style.bottom = chatBottom + 'px';
    chatWindow.style.right = chatRight + 'px';
  }

  function toggleChat() {
    isOpen = !isOpen;
    const chatWindow = document.getElementById('chatech-window');
    const badge = document.getElementById('chatech-badge');
    
    if (isOpen) {
      updateChatPosition();
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
          setTimeout(() => addMessage('bot', data.botResponse), 200);
        } else if (data.error) {
          addMessage('bot', data.error);
        }
      })
      .catch(err => {
        document.getElementById('chatech-typing').style.display = 'none';
        document.getElementById('chatech-send').disabled = false;
        isLoading = false;
        addMessage('bot', 'Error de conexión. Intenta de nuevo.');
        console.error('ChatEch:', err);
      });
  }

  function addMessage(role, content) {
    const messagesDiv = document.getElementById('chatech-messages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatech-message';
    
    const baseStyle = `
      padding: 10px 14px;
      border-radius: 14px;
      margin-bottom: 8px;
      max-width: 85%;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    if (role === 'user') {
      messageDiv.style.cssText = baseStyle + `
        background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      `;
    } else {
      messageDiv.style.cssText = baseStyle + `
        background: white;
        color: #1e293b;
        border: 1px solid #e2e8f0;
        border-bottom-left-radius: 4px;
        white-space: pre-line;
      `;
    }
    
    messageDiv.textContent = content;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
})();
