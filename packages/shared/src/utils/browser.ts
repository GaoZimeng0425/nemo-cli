import open, { apps, openApp } from 'open'

export const openBrowser = (url: string) => {
  open(url)
}

export const openBrowserApp = (url: string) => {
  openApp(url)
}

export const getBrowserApps = () => {
  return apps
}
