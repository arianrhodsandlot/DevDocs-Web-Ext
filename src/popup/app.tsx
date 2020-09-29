import React from 'react'
import { Router, Route, Routes } from 'react-router-dom'
import Header from './header'
import Home from './home'
import Search from './search'
import Content from './content'
import history from './history'

export default function App () {
  return <>
    <Router location={history.location} navigator={history}>
      <Header />
    </Router>
    <Router location={history.location} navigator={history}>
      <Routes>
        <Route path='/'><Home /></Route>
        <Route path='/search'><Search /></Route>
        <Route path='*'><Content /></Route>
      </Routes>
    </Router>
  </>
}
