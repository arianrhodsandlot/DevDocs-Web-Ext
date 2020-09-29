import querystring from 'querystring'
import React, { useState, useEffect } from 'react'
import { object } from 'prop-types'
import ReactDOM from 'react-dom'
import browser from 'webextension-polyfill'
import classnames from 'classnames'
import key from 'keymaster'
import { Link, useLocation } from 'react-router-dom'
import Docs from '../background/docs'
import history from './history'

function getDocVersion (doc: Doc) {
  return doc.slug.includes('~') ? doc.slug.split('~')[1] : ''
}

function getEntryUrl (entry: Entry) {
  const [entryPath, entryHash] = entry.path.split('#')
  const pathAndHash = entryHash ? `${entryPath}#${entryHash}` : `${entryPath}`
  return `/${entry.doc.slug}/${pathAndHash}`
}

export default function Search () {
  console.log('rendering search')
  const location = useLocation()
  const [entries, setEntries] = useState(null as null | Unpromisify<ReturnType<Docs['searchEntries']>>)
  const [focusPos, setFocusPos] = useState(0)
  const [failMessage, setFailMessage] = useState('')
  const entryRefs: React.RefObject<Link>[] = []

  useEffect(() => {
    key('down', () => {
      focusNextEntry()
      return false
    })
    key('up', () => {
      focusPrevEntry()
      return false
    })
    key('enter', () => {
      enterFocusEntry()
      return false
    })

    return () => {
      key.unbind('down')
      key.unbind('up')
      key.unbind('enter')
    }
  }, [focusNextEntry, focusPrevEntry, enterFocusEntry])

  useEffect(() => {
    search()
  }, [location])

  useEffect(() => {
    if (!entries) {
      return
    }
    const ref = getEntryRef(entries[focusPos])
    if (ref && ref.current) {
      // eslint-disable-next-line react/no-find-dom-node
      const entryDomNode = ReactDOM.findDOMNode(ref.current)
      if (entryDomNode instanceof HTMLAnchorElement) {
        entryDomNode.scrollIntoView({ block: 'end', behavior: 'smooth' })
      }
    }
  }, [focusPos])

  function focusNextEntry () {
    if (!entries) {
      return
    }
    const maxFocusPos = entries.length - 1
    setFocusPos(focusPos === maxFocusPos ? 0 : focusPos + 1)
  }

  function focusPrevEntry () {
    if (!entries) {
      return
    }
    const maxFocusPos = entries.length - 1
    setFocusPos(focusPos === 0 ? maxFocusPos : focusPos - 1)
  }

  function enterFocusEntry () {
    if (!entries) {
      return
    }
    const focusEntry = entries[focusPos]
    if (focusEntry) {
      history.push(getEntryUrl(focusEntry))
    }
  }

  function getEntryRef (entry: Entry) {
    if (!entries) {
      return null
    }
    const index = entries.indexOf(entry)
    let ref = entryRefs[index]
    if (!ref) {
      ref = React.createRef()
      entryRefs[index] = ref
    }
    return ref
  }

  async function search () {
    const { query = '', scope = '' } = querystring.parse(location.search.slice(1))
    if (!query && !scope) {
      history.replace('/')
      return
    }

    let entries: Entry[] = []
    const focusPos = 0
    let failMessage = ''

    let response: { status: 'success'; content: Entry[] }
    try {
      response = await browser.runtime.sendMessage({
        action: 'search-entry',
        payload: { query, scope }
      }) as { status: 'success'; content: Entry[] }
      entries = response.content
    } catch (error) {
      failMessage = error.message
    }

    setEntries(entries)
    setFocusPos(focusPos)
    setFailMessage(failMessage)
  }

  if (failMessage) {
    return (
      <div className='_container' role='document'>
        <div className='_content' role='main'>
          <div>
            <div className='_splash-title error'>{failMessage}</div>
          </div>
        </div>
      </div>
    )
  }

  const noResults =
    <>
      <div className='_list-note'>
        No results.
      </div>
      <div className='_list-note'>
        Note: documentations must be <a href='https://devdocs.io/settings' className='_list-note-link' target='_blank' rel='noopener noreferrer' onClick={(e) => {
          e.preventDefault()
          browser.tabs.create({ url: e.currentTarget.href })
        }}>enabled</a> to appear in the search.
      </div>
    </>

  const results = entries
    ? entries.map((entry, i) => <Link
      className={classnames(
        '_list-item', '_list-hover', '_list-entry',
        `_icon-${entry.doc.icon}`,
        { focus: focusPos === i ? 'focus' : '' }
      )}
      key={`${entry.doc.slug}-${entry.doc.name}/${entry.path}-${entry.name}`}
      to={getEntryUrl(entry)}
      ref={getEntryRef(entry)}>
      <div className='_list-count'>{getDocVersion(entry.doc)}</div>
      <div className='_list-text'>{entry.name}</div>
    </Link>)
    : null

  return (
    <div className='_sidebar'>
      <div className='_list'>
        {entries ? (entries.length > 0 ? results : noResults) : null}
      </div>
    </div>
  )
}
