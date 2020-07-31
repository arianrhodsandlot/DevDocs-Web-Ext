import test from 'ava'
import { ElementHandle } from 'puppeteer'
import { getTestContext, TestContext } from './helpers'

test.serial.before(async (t) => {
  t.context = await getTestContext()
})

test.serial.beforeEach(async (t) => {
  const { popupPage } = t.context as TestContext
  await popupPage.bringToFront()
  await popupPage.focus('input')
  await popupPage.click('input', { clickCount: 3 })
  await popupPage.waitFor(100)
  await popupPage.keyboard.press('Backspace')
  await popupPage.waitFor(100)
  await popupPage.keyboard.press('Backspace')
  await popupPage.waitForSelector('._splash-title')
})

test.serial('search and navigate in results', async (t) => {
  async function getClassNames (element: ElementHandle<Element>) {
    const jsHandle = await element.getProperty('className')
    const classNames = await jsHandle.jsonValue() as string
    return classNames.split(/\s+/u)
  }

  const { popupPage } = t.context as TestContext
  await popupPage.keyboard.type('a')
  await popupPage.waitForSelector('._list-item')

  const listItems = await popupPage.$$('._list-item')
  t.is(listItems.length, 50)

  const focusedListItem = await popupPage.$$('._list-item.focus')
  t.is(focusedListItem.length, 1)

  const [firstListItem, secondListItem] = listItems
  const lastListItem = listItems[listItems.length - 1]

  t.true((await getClassNames(firstListItem)).includes('focus'))
  t.false((await getClassNames(secondListItem)).includes('focus'))
  t.false((await getClassNames(lastListItem)).includes('focus'))

  await popupPage.keyboard.press('ArrowDown')
  t.false((await getClassNames(firstListItem)).includes('focus'))
  t.true((await getClassNames(secondListItem)).includes('focus'))
  t.false((await getClassNames(lastListItem)).includes('focus'))

  await popupPage.keyboard.press('ArrowUp')
  await popupPage.keyboard.press('ArrowUp')
  t.false((await getClassNames(firstListItem)).includes('focus'))
  t.false((await getClassNames(secondListItem)).includes('focus'))
  t.true((await getClassNames(lastListItem)).includes('focus'))
})

test.serial('search in a certain doc', async (t) => {
  const { popupPage } = t.context as TestContext
  await popupPage.keyboard.type('c')
  await popupPage.waitFor(100)
  await popupPage.keyboard.press('Tab')
  await popupPage.waitForSelector('._search-tag')
  t.is(await popupPage.$eval('._search-tag', (e) => e.innerHTML), 'CSS')

  await popupPage.keyboard.type('bxs')
  await popupPage.waitForSelector('._list-item')
  const firstLiteItemText = await popupPage.$eval('._list-item', (e) => (e as HTMLDivElement).textContent)
  t.is(firstLiteItemText, 'box-shadow')
})

test.serial('content', async (t) => {
  const { popupPage, browser } = t.context as TestContext
  await popupPage.keyboard.type('a')
  await popupPage.waitForSelector('._list-item.focus')
  await popupPage.keyboard.press('Enter')
  t.truthy(await popupPage.waitForSelector('._page._mdn'))
  t.falsy(await popupPage.$eval('._page', (e) => e.scrollTop))

  await popupPage.keyboard.press('Space')
  await popupPage.waitFor(500)
  t.truthy(await popupPage.$eval('._page', (e) => e.scrollTop))

  await popupPage.keyboard.down('Shift')
  await popupPage.keyboard.press('Space')
  await popupPage.keyboard.up('Shift')
  await popupPage.waitFor(500)
  t.falsy(await popupPage.$eval('._page', (e) => e.scrollTop))

  const externalLink = 'https://developer.mozilla.org/en-US/docs/HTML/Content_categories'
  await popupPage.click(`a[href="${externalLink}"]`)
  await popupPage.waitFor(1000)
  const pages = await browser.pages()
  const newPage = pages.find((p) => p.url().includes('developer.mozilla.org'))!
  t.truthy(newPage)
  await newPage.close()

  await popupPage.click('a[href="../global_attributes"]')
  t.true(popupPage.url().endsWith('#/html/global_attributes'))
})

test.serial.after(async (t) => {
  const { browser } = t.context as TestContext
  await browser.close()
})
