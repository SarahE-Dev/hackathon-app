'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { hackathonSessionsAPI, hackathonRosterAPI, teamsAPI } from '@/lib/api';

interface RosterEntry {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'judge' | 'fellow';
  status: 'pending' | 'registered' | 'declined';
  userId?: { _id: string; firstName: string; lastName: string; email: string };
  teamId?: { _id: string; name: string };
  notes?: string;
  invitedAt: string;
  registeredAt?: string;
}

interface Team {
  _id: string;
  name: string;
  memberIds: any[];
  projectTitle?: string;
}

interface HackathonSession {
  _id: string;
  title: string;
  description?: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

interface RosterStats {
  totalJudges: number;
  registeredJudges: number;
  totalFellows: number;
  registeredFellows: number;
  assignedToTeams: number;
}

function HackathonManagementContent() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<HackathonSession | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<RosterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'judges' | 'fellows' | 'teams'>('overview');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormRole, setAddFormRole] = useState<'judge' | 'fellow'>('fellow');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleFirstName, setSingleFirstName] = useState('');
  const [singleLastName, setSingleLastName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [saving, setSaving] = useState(false);

  // Team builder state
  const [draggedFellow, setDraggedFellow] = useState<RosterEntry | null>(null);
  const [showCreateTeamsModal, setShowCreateTeamsModal] = useState(false);
  const [teamSize, setTeamSize] = useState(4);
  const [teamPrefix, setTeamPrefix] = useState('Team');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionRes, rosterRes, teamsRes] = await Promise.all([
        hackathonSessionsAPI.getById(sessionId),
        hackathonRosterAPI.getRoster(sessionId),
        teamsAPI.getAllTeams(),
      ]);

      setSession(sessionRes.data?.session);
      setRoster(rosterRes.data?.roster || []);
      setStats(rosterRes.data?.stats);
      setTeams(teamsRes || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadData();
    }
  }, [sessionId, loadData]);

  const handleAddSingle = async () => {
    if (!singleEmail) return;
    setSaving(true);
    try {
      await hackathonRosterAPI.addToRoster(sessionId, {
        email: singleEmail,
        firstName: singleFirstName,
        lastName: singleLastName,
        role: addFormRole,
      });
      setSingleEmail('');
      setSingleFirstName('');
      setSingleLastName('');
      await loadData();
      setShowAddForm(false);
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to add to roster');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkEmails.trim()) return;
    setSaving(true);
    try {
      const lines = bulkEmails.split('\n').filter(line => line.trim());
      const entries = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        return {
          email: parts[0],
          firstName: parts[1] || '',
          lastName: parts[2] || '',
        };
      });

      const result = await hackathonRosterAPI.bulkAddToRoster(sessionId, {
        entries,
        role: addFormRole,
      });

      alert(result.message);
      setBulkEmails('');
      await loadData();
      setShowAddForm(false);
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to bulk add');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromRoster = async (id: string) => {
    if (!confirm('Remove this person from the roster?')) return;
    try {
      await hackathonRosterAPI.removeFromRoster(id);
      await loadData();
    } catch (error) {
      alert('Failed to remove from roster');
    }
  };

  const handleDragStart = (entry: RosterEntry) => {
    setDraggedFellow(entry);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnTeam = async (teamId: string | null) => {
    if (!draggedFellow) return;
    try {
      await hackathonRosterAPI.assignToTeam(draggedFellow._id, teamId);
      await loadData();
    } catch (error) {
      alert('Failed to assign to team');
    }
    setDraggedFellow(null);
  };

  const handleCreateTeams = async () => {
    try {
      setSaving(true);
      const result = await hackathonRosterAPI.createTeamsFromRoster(sessionId, {
        teamSize,
        teamNamePrefix: teamPrefix,
      });
      alert(result.message);
      setShowCreateTeamsModal(false);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create teams');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSingleTeam = async () => {
    const name = prompt('Enter team name:');
    if (!name) return;
    try {
      await teamsAPI.createTeam({ name });
      await loadData();
    } catch (error) {
      alert('Failed to create team');
    }
  };

  const judges = roster.filter(r => r.role === 'judge');
  const fellows = roster.filter(r => r.role === 'fellow');
  const unassignedFellows = fellows.filter(f => !f.teamId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading hackathon...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <p className="text-gray-400">Hackathon not found</p>
          <Link href="/admin/sessions" className="text-neon-blue hover:underline mt-4 inline-block">
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Link href="/admin" className="hover:text-white">Admin</Link>
                <span>/</span>
                <Link href="/admin/sessions" className="hover:text-white">Sessions</Link>
                <span>/</span>
                <span className="text-white">{session.title}</span>
              </div>
              <h1 className="text-2xl font-bold text-gradient">{session.title}</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              session.status === 'active' ? 'bg-green-500/20 text-green-400' :
              session.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {session.status}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'judges', label: `Judges (${judges.length})`, icon: '⚖️' },
              { id: 'fellows', label: `Fellows (${fellows.length})`, icon: '👥' },
              { id: 'teams', label: `Team Builder`, icon: '🏗️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-4 font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-neon-blue text-neon-blue bg-neon-blue/5'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="glass rounded-xl p-5 border border-neon-purple/20">
                <p className="text-3xl font-bold text-neon-purple">{stats.totalJudges}</p>
                <p className="text-sm text-gray-400">Total Judges</p>
              </div>
              <div className="glass rounded-xl p-5 border border-green-500/20">
                <p className="text-3xl font-bold text-green-400">{stats.registeredJudges}</p>
                <p className="text-sm text-gray-400">Registered Judges</p>
              </div>
              <div className="glass rounded-xl p-5 border border-neon-blue/20">
                <p className="text-3xl font-bold text-neon-blue">{stats.totalFellows}</p>
                <p className="text-sm text-gray-400">Total Fellows</p>
              </div>
              <div className="glass rounded-xl p-5 border border-green-500/20">
                <p className="text-3xl font-bold text-green-400">{stats.registeredFellows}</p>
                <p className="text-sm text-gray-400">Registered Fellows</p>
              </div>
              <div className="glass rounded-xl p-5 border border-orange-500/20">
                <p className="text-3xl font-bold text-orange-400">{stats.assignedToTeams}</p>
                <p className="text-sm text-gray-400">In Teams</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => { setAddFormRole('judge'); setShowAddForm(true); }}
                    className="w-full p-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-left transition-all"
                  >
                    <span className="mr-2">⚖️</span> Add Judges to Roster
                  </button>
                  <button
                    onClick={() => { setAddFormRole('fellow'); setShowAddForm(true); }}
                    className="w-full p-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-left transition-all"
                  >
                    <span className="mr-2">👥</span> Add Fellows to Roster
                  </button>
                  <button
                    onClick={() => setActiveTab('teams')}
                    className="w-full p-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-left transition-all"
                  >
                    <span className="mr-2">🏗️</span> Build Teams
                  </button>
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">Registration Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Judges</span>
                      <span>{stats.registeredJudges}/{stats.totalJudges}</span>
                    </div>
                    <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neon-purple transition-all"
                        style={{ width: `${stats.totalJudges > 0 ? (stats.registeredJudges / stats.totalJudges) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Fellows</span>
                      <span>{stats.registeredFellows}/{stats.totalFellows}</span>
                    </div>
                    <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neon-blue transition-all"
                        style={{ width: `${stats.totalFellows > 0 ? (stats.registeredFellows / stats.totalFellows) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Team Assignments</span>
                      <span>{stats.assignedToTeams}/{stats.totalFellows}</span>
                    </div>
                    <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 transition-all"
                        style={{ width: `${stats.totalFellows > 0 ? (stats.assignedToTeams / stats.totalFellows) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Judges Tab */}
        {activeTab === 'judges' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Judge Roster</h2>
              <button
                onClick={() => { setAddFormRole('judge'); setShowAddForm(true); }}
                className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 rounded-lg font-medium transition-all"
              >
                + Add Judges
              </button>
            </div>

            {judges.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center border border-gray-700">
                <div className="text-5xl mb-4">⚖️</div>
                <h3 className="text-xl font-bold mb-2">No Judges Added</h3>
                <p className="text-gray-400 mb-4">Add judges to the roster by their email addresses.</p>
                <button
                  onClick={() => { setAddFormRole('judge'); setShowAddForm(true); }}
                  className="px-6 py-2 bg-neon-purple hover:bg-neon-purple/80 rounded-lg font-medium"
                >
                  Add Judges
                </button>
              </div>
            ) : (
              <div className="glass rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Name</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {judges.map((entry) => (
                      <tr key={entry._id} className="hover:bg-dark-700">
                        <td className="p-4">{entry.email}</td>
                        <td className="p-4">
                          {entry.userId
                            ? `${entry.userId.firstName} ${entry.userId.lastName}`
                            : entry.firstName || entry.lastName
                            ? `${entry.firstName || ''} ${entry.lastName || ''}`
                            : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.status === 'registered' ? 'bg-green-500/20 text-green-400' :
                            entry.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleRemoveFromRoster(entry._id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fellows Tab */}
        {activeTab === 'fellows' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Fellow Roster</h2>
              <button
                onClick={() => { setAddFormRole('fellow'); setShowAddForm(true); }}
                className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 rounded-lg font-medium transition-all"
              >
                + Add Fellows
              </button>
            </div>

            {fellows.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center border border-gray-700">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-xl font-bold mb-2">No Fellows Added</h3>
                <p className="text-gray-400 mb-4">Add fellows to the roster by their email addresses.</p>
                <button
                  onClick={() => { setAddFormRole('fellow'); setShowAddForm(true); }}
                  className="px-6 py-2 bg-neon-blue hover:bg-neon-blue/80 rounded-lg font-medium"
                >
                  Add Fellows
                </button>
              </div>
            ) : (
              <div className="glass rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Name</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Team</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {fellows.map((entry) => (
                      <tr key={entry._id} className="hover:bg-dark-700">
                        <td className="p-4">{entry.email}</td>
                        <td className="p-4">
                          {entry.userId
                            ? `${entry.userId.firstName} ${entry.userId.lastName}`
                            : entry.firstName || entry.lastName
                            ? `${entry.firstName || ''} ${entry.lastName || ''}`
                            : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.status === 'registered' ? 'bg-green-500/20 text-green-400' :
                            entry.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {entry.teamId ? (
                            <span className="px-2 py-1 bg-neon-blue/20 text-neon-blue rounded text-xs">
                              {entry.teamId.name}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleRemoveFromRoster(entry._id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Teams Tab - Drag and Drop Builder */}
        {activeTab === 'teams' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Team Builder</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateSingleTeam}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg font-medium transition-all"
                >
                  + Create Empty Team
                </button>
                {unassignedFellows.length > 0 && (
                  <button
                    onClick={() => setShowCreateTeamsModal(true)}
                    className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 rounded-lg font-medium transition-all"
                  >
                    Auto-Create Teams
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Unassigned Fellows */}
              <div
                className={`glass rounded-xl border-2 p-4 min-h-[400px] transition-all ${
                  draggedFellow ? 'border-dashed border-yellow-500' : 'border-gray-700'
                }`}
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnTeam(null)}
              >
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  Unassigned Fellows ({unassignedFellows.length})
                </h3>
                <div className="space-y-2">
                  {unassignedFellows.map((fellow) => (
                    <div
                      key={fellow._id}
                      draggable
                      onDragStart={() => handleDragStart(fellow)}
                      className={`p-3 bg-dark-700 rounded-lg cursor-grab hover:bg-dark-600 transition-all border ${
                        fellow.status === 'registered' ? 'border-green-500/30' : 'border-yellow-500/30'
                      }`}
                    >
                      <p className="font-medium text-sm">
                        {fellow.userId
                          ? `${fellow.userId.firstName} ${fellow.userId.lastName}`
                          : fellow.firstName && fellow.lastName
                          ? `${fellow.firstName} ${fellow.lastName}`
                          : fellow.email}
                      </p>
                      <p className="text-xs text-gray-400">{fellow.email}</p>
                      <span className={`text-xs ${
                        fellow.status === 'registered' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {fellow.status}
                      </span>
                    </div>
                  ))}
                  {unassignedFellows.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      All fellows assigned to teams
                    </p>
                  )}
                </div>
              </div>

              {/* Teams */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const teamFellows = fellows.filter(f => f.teamId?._id === team._id);
                  return (
                    <div
                      key={team._id}
                      className={`glass rounded-xl border-2 p-4 min-h-[200px] transition-all ${
                        draggedFellow ? 'border-dashed border-neon-blue' : 'border-gray-700'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDropOnTeam(team._id)}
                    >
                      <h4 className="font-bold mb-3 text-neon-blue">{team.name}</h4>
                      <div className="space-y-2">
                        {teamFellows.map((fellow) => (
                          <div
                            key={fellow._id}
                            draggable
                            onDragStart={() => handleDragStart(fellow)}
                            className="p-2 bg-dark-700 rounded cursor-grab hover:bg-dark-600 transition-all"
                          >
                            <p className="font-medium text-sm">
                              {fellow.userId
                                ? `${fellow.userId.firstName} ${fellow.userId.lastName}`
                                : fellow.firstName && fellow.lastName
                                ? `${fellow.firstName} ${fellow.lastName}`
                                : fellow.email}
                            </p>
                            <p className="text-xs text-gray-400">{fellow.email}</p>
                          </div>
                        ))}
                        {teamFellows.length === 0 && (
                          <p className="text-gray-500 text-sm text-center py-4">
                            Drag fellows here
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        {teamFellows.length} member{teamFellows.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  );
                })}
                {teams.length === 0 && (
                  <div className="md:col-span-2 glass rounded-xl p-12 text-center border border-gray-700">
                    <div className="text-5xl mb-4">🏗️</div>
                    <h3 className="text-xl font-bold mb-2">No Teams Yet</h3>
                    <p className="text-gray-400 mb-4">Create teams manually or auto-generate from the roster.</p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={handleCreateSingleTeam}
                        className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg"
                      >
                        Create Empty Team
                      </button>
                      {unassignedFellows.length > 0 && (
                        <button
                          onClick={() => setShowCreateTeamsModal(true)}
                          className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 rounded-lg"
                        >
                          Auto-Create Teams
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add to Roster Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Add {addFormRole === 'judge' ? 'Judges' : 'Fellows'} to Roster
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setAddMode('single')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    addMode === 'single' ? 'bg-neon-blue text-white' : 'bg-dark-700 text-gray-400'
                  }`}
                >
                  Single Entry
                </button>
                <button
                  onClick={() => setAddMode('bulk')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    addMode === 'bulk' ? 'bg-neon-blue text-white' : 'bg-dark-700 text-gray-400'
                  }`}
                >
                  Bulk Import
                </button>
              </div>

              {addMode === 'single' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name</label>
                      <input
                        type="text"
                        value={singleFirstName}
                        onChange={(e) => setSingleFirstName(e.target.value)}
                        className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <input
                        type="text"
                        value={singleLastName}
                        onChange={(e) => setSingleLastName(e.target.value)}
                        className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddSingle}
                    disabled={saving || !singleEmail}
                    className="w-full py-3 bg-neon-blue hover:bg-neon-blue/80 rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add to Roster'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Paste emails (one per line, optionally with names)
                    </label>
                    <textarea
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 h-48"
                      placeholder={`email@example.com
another@example.com, John, Doe
third@example.com, Jane, Smith`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Format: email or email, firstName, lastName
                    </p>
                  </div>
                  <button
                    onClick={handleBulkAdd}
                    disabled={saving || !bulkEmails.trim()}
                    className="w-full py-3 bg-neon-blue hover:bg-neon-blue/80 rounded-lg font-medium disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add All to Roster'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Create Teams Modal */}
      {showCreateTeamsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">Auto-Create Teams</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-400">
                This will create teams from {unassignedFellows.length} unassigned fellows.
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Team Size</label>
                <input
                  type="number"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value) || 4)}
                  min={2}
                  max={10}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Team Name Prefix</label>
                <input
                  type="text"
                  value={teamPrefix}
                  onChange={(e) => setTeamPrefix(e.target.value)}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                  placeholder="Team"
                />
              </div>
              <p className="text-sm text-gray-400">
                This will create approximately {Math.ceil(unassignedFellows.length / teamSize)} teams.
              </p>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateTeamsModal(false)}
                  className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeams}
                  disabled={saving}
                  className="flex-1 py-2 bg-neon-green hover:bg-neon-green/80 rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Teams'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HackathonManagementPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <HackathonManagementContent />
    </RoleGuard>
  );
}
