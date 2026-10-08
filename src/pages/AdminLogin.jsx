import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      console.log('=================================')
      console.log('ADMIN LOGIN START')
      console.log('Email:', email.trim())
      console.log('=================================')

      // --------------------------------------------------
      // STEP 1: SUPABASE AUTH LOGIN
      // --------------------------------------------------

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        })

      console.log('AUTH DATA:', data)
      console.log('AUTH ERROR:', loginError)

      if (loginError) {
        console.error(
          'LOGIN FAILED:',
          loginError.message
        )

        setError(
          `Login failed: ${loginError.message}`
        )

        setLoading(false)
        return
      }

      if (!data?.user) {
        console.error(
          'No authenticated user returned.'
        )

        setError(
          'Login succeeded but no user was returned.'
        )

        setLoading(false)
        return
      }

      // --------------------------------------------------
      // STEP 2: GET AUTH USER
      // --------------------------------------------------

      const user = data.user

      console.log('AUTHENTICATION SUCCESS')
      console.log('USER ID:', user.id)
      console.log('USER EMAIL:', user.email)

      // --------------------------------------------------
      // STEP 3: CHECK ADMIN_USERS
      // --------------------------------------------------

      const {
        data: admin,
        error: adminError,
      } = await supabase
        .from('admin_users')
        .select(
          'id, user_id, email, is_active'
        )
        .eq('user_id', user.id)
        .maybeSingle()

      console.log('ADMIN RECORD:', admin)
      console.log('ADMIN ERROR:', adminError)

      if (adminError) {
        console.error(
          'ADMIN CHECK FAILED:',
          adminError.message
        )

        await supabase.auth.signOut()

        setError(
          `Admin verification failed: ${adminError.message}`
        )

        setLoading(false)
        return
      }

      // --------------------------------------------------
      // STEP 4: ADMIN RECORD NOT FOUND
      // --------------------------------------------------

      if (!admin) {
        console.error(
          'No admin_users record found for this user.'
        )

        await supabase.auth.signOut()

        setError(
          'Login successful, but this user is not registered as an admin.'
        )

        setLoading(false)
        return
      }

      // --------------------------------------------------
      // STEP 5: CHECK ACTIVE STATUS
      // --------------------------------------------------

      if (!admin.is_active) {
        console.error(
          'Admin account is inactive.'
        )

        await supabase.auth.signOut()

        setError(
          'Your admin account is inactive.'
        )

        setLoading(false)
        return
      }

      // --------------------------------------------------
      // STEP 6: SUCCESS
      // --------------------------------------------------

      console.log('=================================')
      console.log('ADMIN VERIFIED SUCCESSFULLY')
      console.log('ADMIN ID:', admin.id)
      console.log('ADMIN EMAIL:', admin.email)
      console.log('REDIRECTING TO /admin')
      console.log('=================================')

      navigate('/admin')

    } catch (err) {
      console.error(
        'UNEXPECTED LOGIN ERROR:',
        err
      )

      setError(
        err?.message ||
        'Unexpected error while logging in.'
      )

      setLoading(false)

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">

      <div className="admin-login-card">

        <div className="admin-logo">
          SM
        </div>

        <h1>
          Admin Login
        </h1>

        <p>
          Satta Matka Bangalore
        </p>

        <form onSubmit={handleLogin}>

          <label>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Admin email"
            autoComplete="email"
            required
          />

          <label>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Signing in...'
              : 'Sign In'}
          </button>

        </form>

      </div>

    </div>
  )
}

export default AdminLogin