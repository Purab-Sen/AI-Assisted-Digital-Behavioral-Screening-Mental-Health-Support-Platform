import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import './PatientDetail.css'

export default function PatientDetail() {
  const { id } = useParams()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/professional/patients/${id}`)
      setPatient(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load patient')
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!note.trim()) return
    try {
      const res = await api.post(`/professional/patients/${id}/notes`, { content: note })
      setNote('')
      fetchDetail()
    } catch (err) {
      console.error(err)
      alert('Failed to add note')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-red-600">{error}</div>
    </div>
  )

  return (
    <div className="professional-dashboard max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{patient.first_name} {patient.last_name}</h1>
        <p className="mt-2 text-gray-600">Shared on {new Date(patient.consultation_date).toLocaleString()}</p>
      </div>

      <div className="card-section mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Latest Analysis</h2>
        {patient.latest_analysis ? (
          <div>
            <div className="text-sm text-gray-700">Composite score: {patient.latest_analysis.composite_score}</div>
            <div className="text-sm text-gray-700">Trend: {patient.latest_analysis.trend_direction}</div>
          </div>
        ) : (
          <p className="text-gray-500">No analysis available</p>
        )}
      </div>

      <div className="card-section mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Screenings</h2>
        {patient.screenings && patient.screenings.length > 0 ? (
          <ul className="space-y-3">
            {patient.screenings.map(s => (
              <li key={s.id} className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium">{new Date(s.completed_at).toLocaleString()}</div>
                <div className="text-sm text-gray-600">Score: {s.raw_score} — Risk: {s.risk_level}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No screenings yet</p>
        )}
      </div>

      <div className="card-section mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
        <div className="mb-4">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-md p-2" placeholder="Add a note about this patient" />
          <div className="mt-2">
            <button onClick={addNote} className="px-4 py-2 bg-green-600 text-white rounded-md">Add Note</button>
          </div>
        </div>

        {patient.notes && patient.notes.length > 0 ? (
          <ul className="space-y-3">
            {patient.notes.map(n => (
              <li key={n.id} className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-700">{n.content}</div>
                <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No notes yet</p>
        )}
      </div>

      <div>
        <Link to="/professional/patients" className="text-indigo-600 hover:underline">Back to patients</Link>
      </div>
    </div>
  )
}
