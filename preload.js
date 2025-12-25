const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getParents: () => ipcRenderer.invoke('get-parents'),
  addParent: (parent) => ipcRenderer.invoke('add-parent', parent),
  deleteParent: (id) => ipcRenderer.invoke('delete-parent', id),
  
  getChildren: () => ipcRenderer.invoke('get-children'),
  addChild: (child) => ipcRenderer.invoke('add-child', child),
  deleteChild: (id) => ipcRenderer.invoke('delete-child', id),
  
  getRates: () => ipcRenderer.invoke('get-rates'),
  addRate: (rate) => ipcRenderer.invoke('add-rate', rate),
  deleteRate: (id) => ipcRenderer.invoke('delete-rate', id),
  
  getPayments: () => ipcRenderer.invoke('get-payments'),
  addPayment: (payment) => ipcRenderer.invoke('add-payment', payment),
  
  getAttendance: (month) => ipcRenderer.invoke('get-attendance', month),
  setAttendance: (childId, date, present) => ipcRenderer.invoke('set-attendance', childId, date, present),
  
  sendEmail: (options) => ipcRenderer.invoke('send-email', options),
  
  backupData: (data) => ipcRenderer.invoke('backup-data', data),
  restoreData: () => ipcRenderer.invoke('restore-data'),
  
  getEmailConfig: () => ipcRenderer.invoke('get-email-config'),
  saveEmailConfig: (config) => ipcRenderer.invoke('save-email-config', config),
  testEmail: (config) => ipcRenderer.invoke('test-email', config)
});
