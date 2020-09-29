import url from 'url'
import React, { useState, useEffect, useRef } from 'react'
import browser from 'webextension-polyfill'
import classnames from 'classnames'
import key from 'keymaster'
import ky from 'ky'
import { History } from 'history'
import { useLocation } from 'react-router-dom'
import { lruGetItem, lruSetItem } from '../common/lru'
import history from './history'

export default function Content () {
  console.log('rendering content')
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [contentUrl, setContentUrl] = useState('')
  const [content, setContent] = useState('')
  const [doc, setDoc] = useState(null as null | Doc)
  const pageRef = useRef<HTMLDivElement>()
  const prevPathRef = useRef<string | undefined>()
  const prevPath = prevPathRef.current

  useEffect(() => {
    key('enter', () => false)

    key('space', () => {
      if (pageRef.current) {
        pageRef.current.scrollBy({
          top: 150,
          left: 0,
          behavior: 'smooth'
        })
      }
      return false
    })

    key('shift+space', () => {
      if (pageRef.current) {
        pageRef.current.scrollBy({
          top: -150,
          left: 0,
          behavior: 'smooth'
        })
      }
      return false
    });
    (async () => {
      const scope = location.pathname.split('/')[1].split('~')[0]
      if (!scope) {
        return
      }
      const contentDoc = await browser.runtime.sendMessage({
        action: 'get-content-doc',
        payload: { scope }
      }) as Doc
      if (contentDoc) {
        setDoc(contentDoc)
      }
    })()

    return () => {
      key.unbind('enter')
      key.unbind('space')
      key.unbind('shift+space')
    }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname === prevPath) {
      scrollToHash()
    } else {
      setContentUrl(`http://docs.devdocs.io${location.pathname}.html${location.search}`)
    }
    prevPathRef.current = location.pathname
  }, [location.pathname, location.hash, location.search, prevPath])

  useEffect(() => {
    if (!contentUrl) {
      return
    }

    (async () => {
      let docContent = await lruGetItem(contentUrl)
      if (docContent) {
        setContent(docContent)
      } else {
        setLoading(true)
      }
      docContent = await ky(contentUrl).text()
      setLoading(false)
      setContent(docContent)
      await lruSetItem(contentUrl, docContent)
    })()
  }, [contentUrl])

  useEffect(() => {
    if (!content) {
      return
    }
    if (!location.hash) {
      return
    }
    scrollToHash()
  }, [content, doc, location.hash])

  function scrollToHash () {
    let entryHash = location.hash
    if (!entryHash || !pageRef.current) {
      return
    }
    if (entryHash.startsWith('#')) {
      entryHash = entryHash.slice(1)
    }
    if (entryHash) {
      const scrollTargetId = entryHash.startsWith('.') ? entryHash.slice(1) : entryHash
      const scrollTarget: HTMLDivElement | null = document.querySelector(`div#${scrollTargetId}`)
      if (scrollTarget) {
        pageRef.current.scrollTo(0, scrollTarget.offsetTop)
      }
    }
  }

  function onContentClick (e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    let target = e.target as HTMLElement | null
    while (target && target.tagName !== 'A') {
      if (target === e.currentTarget) {
        return
      }
      target = target.parentElement
    }
    e.preventDefault()
    if (!target) {
      return
    }
    const href = target.getAttribute('href') || ''
    if (href.startsWith('http://') || href.startsWith('https://')) {
      browser.tabs.create({ url: href })
    } else {
      const currentUrl = location.pathname
      // eslint-disable-next-line node/no-deprecated-api
      const targetUrl = url.resolve(currentUrl, href)
      history.replace(targetUrl)
    }
  }

  if (loading) {
    return (
      <div className='_container' role='document'>
        <div className='_content' role='main'>
          <div className='_page'>
            <div className='_content-loading' />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='_container' role='document'>
      <div className='_content' role='main'>
        <div
          className={classnames(['_page', doc ? `_${doc.type}` : ''])}
          onClick={onContentClick}
          ref={pageRef as React.MutableRefObject<HTMLDivElement>}
          dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  )
}
