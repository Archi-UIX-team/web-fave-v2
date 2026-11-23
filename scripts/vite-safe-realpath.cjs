// Vite 7 performs a one-time `net use` probe on Windows to detect mapped
// drives. Some managed Windows environments block that probe with EPERM,
// which otherwise causes the dev server to render Vite's error overlay.
// Local project paths do not need the probe, so report an empty mapping.
const childProcess = require('node:child_process')
const { syncBuiltinESMExports } = require('node:module')

const originalExec = childProcess.exec

childProcess.exec = function safeViteExec(command, callback, ...rest) {
  if (command === 'net use') {
    queueMicrotask(() => callback?.(null, '', ''))
    return { kill() {} }
  }

  return originalExec.call(this, command, callback, ...rest)
}

syncBuiltinESMExports()
