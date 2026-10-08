import { useEffect, useState } from 'react'
import {
  Routes,
  Route,
  Link,
  Navigate,
} from 'react-router-dom'

import { supabase } from './lib/supabaseClient'
import './App.css'

import JodiChart from './pages/JodiChart'
import PanelChart from './pages/PanelChart'
import Results from './pages/Results'
import History from './pages/History'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

// ============================================================
// INDIA DATE
// ============================================================

function getIndiaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// ============================================================
// INDIA TIME
// ============================================================

function getIndiaTime() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

// ============================================================
// FORMAT DATE
// ============================================================

function getTodayLabel() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(value) {
  if (!value) return '--:--'

  const text = String(value)

  if (text.length >= 5) {
    return text.slice(0, 5)
  }

  return text
}

// ============================================================
// MARKET STATUS
// ============================================================

function getMarketStatus(market, result) {
  if (result) {
    return {
      text: 'PUBLISHED',
      className: 'published',
    }
  }

  if (!market) {
    return {
      text: 'WAITING',
      className: 'waiting',
    }
  }

  if (!market.open_time) {
    return {
      text: 'WAITING',
      className: 'waiting',
    }
  }

  const currentTime = getIndiaTime()

  const currentParts = currentTime.split(':')
  const currentMinutes =
    Number(currentParts[0]) * 60 +
    Number(currentParts[1])

  const openTime = formatTime(market.open_time)
  const closeTime = formatTime(market.close_time)

  const openParts = openTime.split(':')
  const closeParts = closeTime.split(':')

  const openMinutes =
    Number(openParts[0]) * 60 +
    Number(openParts[1])

  const closeMinutes =
    Number(closeParts[0]) * 60 +
    Number(closeParts[1])

  if (currentMinutes < openMinutes) {
    return {
      text: 'UPCOMING',
      className: 'upcoming',
    }
  }

  if (
    currentMinutes >= openMinutes &&
    currentMinutes <= closeMinutes
  ) {
    return {
      text: 'OPEN',
      className: 'open',
    }
  }

  return {
    text: 'RESULT PENDING',
    className: 'pending',
  }
}

// ============================================================
// HOME PAGE
// ============================================================

function HomePage() {
  const [markets, setMarkets] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  // ----------------------------------------------------------
  // LOAD DATA
  // ----------------------------------------------------------

  useEffect(() => {
    let mounted = true

    async function start() {
      await loadData(mounted)
    }

    start()

    // Refresh every 60 seconds.
    // Supabase Cron continues synchronizing the API every 5 minutes.
    const refreshTimer = setInterval(() => {
      loadData(mounted)
    }, 60 * 1000)

    // Refresh when the browser tab becomes active again.
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible'
      ) {
        loadData(mounted)
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    )

    return () => {
      mounted = false

      clearInterval(refreshTimer)

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      )
    }
  }, [])

  // ----------------------------------------------------------
  // LOAD EVERYTHING
  // ----------------------------------------------------------

  async function loadData(mounted = true) {
    try {
      setErrorMessage('')

      const [
        marketsResult,
        resultsResult,
      ] = await Promise.all([
        fetchMarkets(),
        fetchTodayResults(),
      ])

      if (!mounted) return

      setMarkets(marketsResult)
      setResults(resultsResult)
      setLastUpdated(new Date())
    } catch (error) {
      console.error(
        'Home page loading error:',
        error
      )

      if (!mounted) return

      setErrorMessage(
        'Unable to load live market information.'
      )
    } finally {
      if (mounted) {
        setLoading(false)
      }
    }
  }

  // ----------------------------------------------------------
  // FETCH MARKETS
  // ----------------------------------------------------------

  async function fetchMarkets() {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('active', true)
      .order('display_order', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Markets loading error:',
        error
      )

      throw error
    }

    return data || []
  }

  // ----------------------------------------------------------
  // FETCH TODAY'S PUBLISHED RESULTS
  // ----------------------------------------------------------

  async function fetchTodayResults() {
    const today = getIndiaDate()

    const { data, error } = await supabase
      .from('daily_results')
      .select(
        `
          id,
          market_id,
          result_date,
          open_number,
          jodi,
          close_number,
          open_panel,
          close_panel,
          status
        `
      )
      .eq('result_date', today)
      .eq('status', 'published')

    if (error) {
      console.error(
        'Results loading error:',
        error
      )

      throw error
    }

    const resultMap = {}

    for (const result of data || []) {
      resultMap[result.market_id] = result
    }

    return resultMap
  }

  // ----------------------------------------------------------
  // RESULT STRING
  // ----------------------------------------------------------

  function getFullResult(result) {
    if (!result) {
      return null
    }

    const openPanel =
      result.open_panel ||
      result.open_number ||
      '---'

    const jodi =
      result.jodi ||
      '--'

    const closePanel =
      result.close_panel ||
      result.close_number ||
      '---'

    return `${openPanel}-${jodi}-${closePanel}`
  }

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div className="app">
        <header className="top-header">
          <div className="site-container header-inner">
            <Link
              to="/"
              className="brand"
            >
              <div className="brand-circle">
                SM
              </div>

              <div>
                <div className="brand-title">
                  Satta Matka
                </div>

                <div className="brand-subtitle">
                  Bangalore
                </div>
              </div>
            </Link>

            <nav className="main-nav">
              <Link
                className="active"
                to="/"
              >
                Home
              </Link>

              <Link to="/results">
                Results
              </Link>

              <Link to="/jodi-chart">
                Jodi Chart
              </Link>

              <Link to="/panel-chart">
                Panel Chart
              </Link>

              <Link to="/history">
                History
              </Link>
            </nav>
          </div>
        </header>

        <div className="loading-screen">
          <div className="loading-spinner" />

          <h2>
            Loading today's results...
          </h2>

          <p>
            Connecting to the live database.
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="app">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="top-header">
        <div className="site-container header-inner">

          <Link
            to="/"
            className="brand"
          >
            <div className="brand-circle">
              SM
            </div>

            <div>
              <div className="brand-title">
                Satta Matka
              </div>

              <div className="brand-subtitle">
                Bangalore
              </div>
            </div>
          </Link>

          <nav className="main-nav">

            <Link
              className="active"
              to="/"
            >
              Home
            </Link>

            <Link to="/results">
              Results
            </Link>

            <Link to="/jodi-chart">
              Jodi Chart
            </Link>

            <Link to="/panel-chart">
              Panel Chart
            </Link>

            <Link to="/history">
              History
            </Link>

          </nav>

        </div>
      </header>

      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="home-hero">

        <div className="site-container hero-inner">

          <div className="live-badge">
            <span className="live-dot" />
            LIVE RESULTS
          </div>

          <h1>
            Today's Market Results
          </h1>

          <p>
            Published market information for{' '}
            {getTodayLabel()}.
          </p>

          <div className="hero-actions">

            <a
              href="#today-board"
              className="hero-button primary"
            >
              View Today's Board
            </a>

            <Link
              to="/history"
              className="hero-button secondary"
            >
              Result History
            </Link>

          </div>

        </div>

      </section>

      {/* ======================================================
          MAIN BOARD
      ====================================================== */}

      <main
        id="today-board"
        className="site-container main-area"
      >

        {/* SECTION HEADER */}

        <div className="board-heading">

          <div>
            <div className="section-kicker">
              TODAY'S BOARD
            </div>

            <h2>
              Market Schedule & Results
            </h2>

            <p>
              {getTodayLabel()}
            </p>
          </div>

          <div className="updated-box">

            <span>
              AUTO UPDATED
            </span>

            <strong>
              Every 60 seconds
            </strong>

            {lastUpdated && (
              <small>
                Last checked:{' '}
                {lastUpdated.toLocaleTimeString(
                  'en-IN',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }
                )}
              </small>
            )}

          </div>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="error-box">
            {errorMessage}
          </div>
        )}

        {/* NO MARKETS */}

        {markets.length === 0 ? (

          <div className="empty-box">

            <div className="empty-icon">
              !
            </div>

            <h3>
              No active markets
            </h3>

            <p>
              No active markets are currently
              available in the database.
            </p>

          </div>

        ) : (

          <div className="today-board">

            {markets.map(
              (market, index) => {

                const result =
                  results[market.id]

                const status =
                  getMarketStatus(
                    market,
                    result
                  )

                const fullResult =
                  getFullResult(result)

                const isYellow =
                  index % 2 === 0

                return (
                  <article
                    className={
                      isYellow
                        ? 'market-row yellow-row'
                        : 'market-row white-row'
                    }
                    key={market.id}
                  >

                    {/* LEFT JODI BUTTON */}

                    <div className="board-side">
                      <Link
                        to="/jodi-chart"
                        className="board-action"
                      >
                        Jodi
                      </Link>
                    </div>

                    {/* CENTER */}

                    <div className="market-center">

                      <div
                        className={
                          `market-name ${status.className}`
                        }
                      >
                        {market.name}
                      </div>

                      <div className="market-result">

                        {result ? (
                          fullResult
                        ) : (
                          <span className="waiting-text">
                            {status.text ===
                            'UPCOMING'
                              ? 'WAITING FOR MARKET'
                              : 'RESULT PENDING'}
                          </span>
                        )}

                      </div>

                      <div className="market-time">
                        (
                        {formatTime(
                          market.open_time
                        )}
                        {' - '}
                        {formatTime(
                          market.close_time
                        )}
                        )
                      </div>

                      <div
                        className={
                          `status-pill ${status.className}`
                        }
                      >
                        {status.text}
                      </div>

                      {result && (
                        <div className="result-details">

                          <div>
                            <span>
                              OPEN
                            </span>

                            <strong>
                              {result.open_number ||
                                '---'}
                            </strong>
                          </div>

                          <div>
                            <span>
                              JODI
                            </span>

                            <strong>
                              {result.jodi ||
                                '--'}
                            </strong>
                          </div>

                          <div>
                            <span>
                              CLOSE
                            </span>

                            <strong>
                              {result.close_number ||
                                '---'}
                            </strong>
                          </div>

                        </div>
                      )}

                    </div>

                    {/* RIGHT PANEL BUTTON */}

                    <div className="board-side">
                      <Link
                        to="/panel-chart"
                        className="board-action"
                      >
                        Panel
                      </Link>
                    </div>

                  </article>
                )
              }
            )}

          </div>

        )}

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <div className="information-card">

          <div className="information-icon">
            i
          </div>

          <div>
            <h3>
              About today's board
            </h3>

            <p>
              This page displays published result
              information received through the
              connected database. A market remains
              pending until an actual published result
              is available.
            </p>
          </div>

        </div>

      </main>

      {/* ======================================================
          QUICK LINKS
      ====================================================== */}

      <section className="quick-section">

        <div className="site-container">

          <div className="section-kicker">
            EXPLORE
          </div>

          <h2>
            Charts & History
          </h2>

          <div className="quick-grid">

            <Link
              to="/results"
              className="quick-card"
            >
              <div className="quick-card-icon">
                R
              </div>

              <div>
                <h3>
                  Today's Results
                </h3>

                <p>
                  View published results.
                </p>
              </div>

              <span>
                →
              </span>
            </Link>

            <Link
              to="/jodi-chart"
              className="quick-card"
            >
              <div className="quick-card-icon">
                J
              </div>

              <div>
                <h3>
                  Jodi Chart
                </h3>

                <p>
                  View published Jodi information.
                </p>
              </div>

              <span>
                →
              </span>
            </Link>

            <Link
              to="/panel-chart"
              className="quick-card"
            >
              <div className="quick-card-icon">
                P
              </div>

              <div>
                <h3>
                  Panel Chart
                </h3>

                <p>
                  View published Panel information.
                </p>
              </div>

              <span>
                →
              </span>
            </Link>

            <Link
              to="/history"
              className="quick-card"
            >
              <div className="quick-card-icon">
                H
              </div>

              <div>
                <h3>
                  Result History
                </h3>

                <p>
                  Search previous published results.
                </p>
              </div>

              <span>
                →
              </span>
            </Link>

          </div>

        </div>

      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="site-footer">

        <div className="site-container footer-inner">

          <div>
            <div className="footer-brand">
              Satta Matka Bangalore
            </div>

            <p>
              Published results and historical
              market information.
            </p>
          </div>

          <div className="footer-links">

            <Link to="/">
              Home
            </Link>

            <Link to="/results">
              Results
            </Link>

            <Link to="/jodi-chart">
              Jodi Chart
            </Link>

            <Link to="/panel-chart">
              Panel Chart
            </Link>

            <Link to="/history">
              History
            </Link>

          </div>

        </div>

        <div className="copyright">
          © {new Date().getFullYear()}
          {' '}
          Satta Matka Bangalore
        </div>

      </footer>

    </div>
  )
}

// ============================================================
// ADMIN PROTECTED ROUTE
// ============================================================

function AdminProtectedRoute({ children }) {
  const [checking, setChecking] =
    useState(true)

  const [authorized, setAuthorized] =
    useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    try {
      // ------------------------------------------------------
      // CHECK SUPABASE AUTH
      // ------------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      console.log(
        'PROTECTED ROUTE USER:',
        user
      )

      console.log(
        'PROTECTED ROUTE AUTH ERROR:',
        userError
      )

      if (userError || !user) {
        setAuthorized(false)
        setChecking(false)
        return
      }

      // ------------------------------------------------------
      // CHECK ADMIN USERS
      // IMPORTANT: use user_id
      // ------------------------------------------------------

      const {
        data: adminUser,
        error: adminError,
      } = await supabase
        .from('admin_users')
        .select(
          'id, user_id, email, is_active'
        )
        .eq('user_id', user.id)
        .maybeSingle()

      console.log(
        'PROTECTED ROUTE ADMIN:',
        adminUser
      )

      console.log(
        'PROTECTED ROUTE ADMIN ERROR:',
        adminError
      )

      if (adminError) {
        console.error(
          'Admin check error:',
          adminError.message
        )

        setAuthorized(false)
        setChecking(false)
        return
      }

      if (!adminUser) {
        console.log(
          'No admin_users record found.'
        )

        setAuthorized(false)
        setChecking(false)
        return
      }

      if (!adminUser.is_active) {
        console.log(
          'Admin account is inactive.'
        )

        setAuthorized(false)
        setChecking(false)
        return
      }

      console.log(
        'ADMIN PROTECTED ROUTE: AUTHORIZED'
      )

      setAuthorized(true)

    } catch (error) {
      console.error(
        'Admin authentication error:',
        error
      )

      setAuthorized(false)

    } finally {
      setChecking(false)
    }
  }

  // ----------------------------------------------------------
  // CHECKING
  // ----------------------------------------------------------

  if (checking) {
    return (
      <div className="admin-checking">
        Checking admin access...
      </div>
    )
  }

  // ----------------------------------------------------------
  // NOT AUTHORIZED
  // ----------------------------------------------------------

  if (!authorized) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    )
  }

  // ----------------------------------------------------------
  // AUTHORIZED
  // ----------------------------------------------------------

  return children
}

// ============================================================
// APP ROUTES
// ============================================================

function App() {
  return (
    <Routes>

      {/* HOME */}

      <Route
        path="/"
        element={<HomePage />}
      />

      {/* RESULTS */}

      <Route
        path="/results"
        element={<Results />}
      />

      {/* JODI */}

      <Route
        path="/jodi-chart"
        element={<JodiChart />}
      />

      {/* PANEL */}

      <Route
        path="/panel-chart"
        element={<PanelChart />}
      />

      {/* HISTORY */}

      <Route
        path="/history"
        element={<History />}
      />

      {/* ADMIN LOGIN */}

      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />

      {/* ADMIN DASHBOARD */}

      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />

    </Routes>
  )
}

export default App