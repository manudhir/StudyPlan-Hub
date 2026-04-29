/**
 * Modal Dialog System
 * Usage: Modal.confirm('Delete this?', () => { /* on confirm */ }, () => { /* on cancel */ })
 */
class Modal {
  static confirm(
    message,
    onConfirm,
    onCancel = null,
    options = {}
  ) {
    const {
      title = 'Confirm',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmClass = 'btn-primary',
      isDangerous = false,
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = `btn ${isDangerous ? 'btn-danger' : confirmClass}`;
    confirmBtn.textContent = confirmText;

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = cancelText;

    const closeModal = () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 300);
    };

    confirmBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    };

    cancelBtn.onclick = () => {
      closeModal();
      if (typeof onCancel === 'function') {
        onCancel();
      }
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (typeof onCancel === 'function') {
          onCancel();
        }
      }
    };

    modal.innerHTML = `
      <div class="modal-header">
        <h2>${this.escapeHtml(title)}</h2>
      </div>
      <div class="modal-body">
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;

    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Trigger animation
    setTimeout(() => overlay.classList.add('show'), 10);

    // Focus confirm button for accessibility
    confirmBtn.focus();

    return {
      close: closeModal,
      confirm: () => confirmBtn.click(),
      cancel: () => cancelBtn.click(),
    };
  }

  static alert(message, onOk = null, title = 'Alert') {
    return this.confirm(
      message,
      onOk,
      null,
      { title, confirmText: 'OK', confirmClass: 'btn-primary' }
    );
  }

  static danger(message, onConfirm, onCancel = null, title = 'Confirm Deletion') {
    return this.confirm(message, onConfirm, onCancel, {
      title,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
    });
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make globally available
window.Modal = Modal;
