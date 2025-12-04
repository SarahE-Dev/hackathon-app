'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { usersAPI, hackathonSessionsAPI, hackathonRosterAPI } from '@/lib/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Array<{
    role: string;
    organizationId?: string;
  }>;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface HackathonSession {
  _id: string;
  title: string;
  status: string;
}

interface RosterEntry {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'judge' | 'fellow';
  status: 'pending' | 'registered';
  hackathonSessionId: string;
  teamId?: { _id: string; name: string };
}

function UsersManagementContent() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRoster, setPendingRoster] = useState<RosterEntry[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredPending, setFilteredPending] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showPending, setShowPending] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Invite users state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sessions, setSessions] = useState<HackathonSession[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [inviteRole, setInviteRole] = useState<'fellow' | 'judge'>('fellow');
  const [inviteMode, setInviteMode] = useState<'single' | 'bulk'>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleFirstName, setSingleFirstName] = useState('');
  const [singleLastName, setSingleLastName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null);

  const roleOptions = ['admin', 'judge', 'fellow'];

  // Read filter from URL on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && roleOptions.includes(filterParam)) {
      setRoleFilter(filterParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadUsers();
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await hackathonSessionsAPI.getAllSessions();
      const allSessions = response.data?.sessions || response.sessions || [];
      setSessions(allSessions);
      // Auto-select first active session
      const activeSession = allSessions.find((s: HackathonSession) => s.status === 'active');
      if (activeSession) {
        setSelectedSession(activeSession._id);
      } else if (allSessions.length > 0) {
        setSelectedSession(allSessions[0]._id);
      }

      // Load pending roster entries from all sessions
      const pendingEntries: RosterEntry[] = [];
      for (const session of allSessions) {
        try {
          const rosterRes = await hackathonRosterAPI.getRoster(session._id);
          const roster = rosterRes.data?.roster || [];
          const pending = roster.filter((r: RosterEntry) => r.status === 'pending');
          pendingEntries.push(...pending.map((r: RosterEntry) => ({ ...r, hackathonSessionId: session._id })));
        } catch (e) {
          // Ignore errors for individual sessions
        }
      }
      setPendingRoster(pendingEntries);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleInviteUsers = async () => {
    if (!selectedSession) {
      alert('Please select a hackathon session first');
      return;
    }

    setInviting(true);
    setInviteResult(null);

    try {
      if (inviteMode === 'single') {
        if (!singleEmail.trim()) {
          alert('Please enter an email address');
          setInviting(false);
          return;
        }
        await hackathonRosterAPI.addToRoster(selectedSession, {
          email: singleEmail.trim(),
          firstName: singleFirstName.trim() || undefined,
          lastName: singleLastName.trim() || undefined,
          role: inviteRole,
        });
        setInviteResult({ added: 1, skipped: 0, errors: [] });
        setSingleEmail('');
        setSingleFirstName('');
        setSingleLastName('');
      } else {
        // Bulk mode - parse emails
        const emails = bulkEmails
          .split(/[\n,;]+/)
          .map(e => e.trim())
          .filter(e => e && e.includes('@'));
        
        if (emails.length === 0) {
          alert('Please enter valid email addresses');
          setInviting(false);
          return;
        }

        const response = await hackathonRosterAPI.bulkAddToRoster(selectedSession, {
          entries: emails.map(email => ({ email })),
          role: inviteRole,
        });
        
        setInviteResult(response.data?.results || { added: emails.length, skipped: 0, errors: [] });
        setBulkEmails('');
      }
      
      // Refresh users list
      loadUsers();
    } catch (error: any) {
      console.error('Error inviting users:', error);
      setInviteResult({ 
        added: 0, 
        skipped: 0, 
        errors: [error.response?.data?.message || 'Failed to invite users'] 
      });
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    filterUsers();
  }, [users, pendingRoster, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAllUsers();
      // Handle different response formats: { data: { users } } or { users } or array
      const userData = response?.data?.users || response?.users || (Array.isArray(response) ? response : []);
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) =>
        u.roles.some((r) => r.role === roleFilter)
      );
    }

    setFilteredUsers(filtered);

    // Also filter pending roster entries
    let filteredPendingList = [...pendingRoster];
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filteredPendingList = filteredPendingList.filter(
        (r) =>
          (r.firstName?.toLowerCase() || '').includes(search) ||
          (r.lastName?.toLowerCase() || '').includes(search) ||
          r.email.toLowerCase().includes(search)
      );
    }
    if (roleFilter !== 'all') {
      filteredPendingList = filteredPendingList.filter((r) => r.role === roleFilter);
    }
    setFilteredPending(filteredPendingList);
  };

  const handleAddRole = async (role: string) => {
    if (!selectedUser) return;

    try {
      await usersAPI.addUserRole(selectedUser._id, { role });
      await loadUsers();
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error adding role:', error);
      alert('Failed to add role');
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (!confirm(`Remove ${role} role from this user?`)) return;

    try {
      await usersAPI.removeUserRole(userId, { role });
      await loadUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      alert('Failed to remove role');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditIsActive(user.isActive);
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await usersAPI.update(selectedUser._id, {
        firstName: editFirstName,
        lastName: editLastName,
        isActive: editIsActive,
      });
      await loadUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/50',
      judge: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      proctor: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      grader: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      fellow: 'bg-green-500/20 text-green-400 border-green-500/50',
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  const getRoleStats = () => {
    return {
      total: users.length,
      pending: pendingRoster.length,
      admin: users.filter((u) => u.roles.some((r) => r.role === 'admin')).length,
      judge: users.filter((u) => u.roles.some((r) => r.role === 'judge')).length,
      fellow: users.filter((u) => u.roles.some((r) => r.role === 'fellow')).length,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  const stats = getRoleStats();

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient">
                {roleFilter !== 'all' ? `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}s` : 'User Management'}
              </h1>
              <p className="text-gray-400 mt-1">
                {roleFilter !== 'all' 
                  ? `Viewing ${filteredUsers.length} ${roleFilter}${filteredUsers.length !== 1 ? 's' : ''}`
                  : 'Manage users and their roles'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all"
              >
                + Add Users
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Registered Users</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-yellow-500/30">
            <div className="text-gray-400 text-sm mb-1">Pending Signups</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-red-500/30">
            <div className="text-gray-400 text-sm mb-1">Admins</div>
            <div className="text-2xl font-bold text-red-400">{stats.admin}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-purple-500/30">
            <div className="text-gray-400 text-sm mb-1">Judges</div>
            <div className="text-2xl font-bold text-purple-400">{stats.judge}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-green-500/30">
            <div className="text-gray-400 text-sm mb-1">Fellows</div>
            <div className="text-2xl font-bold text-green-400">{stats.fellow}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-6 border border-gray-800 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
              />
            </div>
            <div className="md:w-48">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
              >
                <option value="all">All Roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pending Roster Entries */}
        {filteredPending.length > 0 && showPending && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-yellow-400">
                ⏳ Pending Signups ({filteredPending.length})
              </h3>
              <button
                onClick={() => setShowPending(false)}
                className="text-sm text-gray-400 hover:text-white"
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPending.map((entry) => (
                <div
                  key={entry._id}
                  className="glass rounded-lg p-4 border border-yellow-500/30 bg-yellow-500/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {entry.firstName || entry.lastName 
                          ? `${entry.firstName || ''} ${entry.lastName || ''}`.trim()
                          : entry.email}
                      </p>
                      <p className="text-sm text-gray-400">{entry.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.role === 'judge' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {entry.role}
                        </span>
                        {entry.teamId && (
                          <span className="text-xs text-gray-400">
                            → {entry.teamId.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                      Awaiting signup
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showPending && filteredPending.length > 0 && (
          <button
            onClick={() => setShowPending(true)}
            className="mb-4 text-sm text-yellow-400 hover:text-yellow-300"
          >
            Show {filteredPending.length} pending signup{filteredPending.length !== 1 ? 's' : ''}
          </button>
        )}

        {/* Registered Users List */}
        <h3 className="text-lg font-bold mb-3">Registered Users ({filteredUsers.length})</h3>
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center border border-gray-800">
              <p className="text-gray-400 text-lg">No registered users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user._id}
                className="glass rounded-xl p-6 border border-gray-800 hover:border-neon-blue/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">
                        {user.firstName} {user.lastName}
                      </h3>
                      {!user.isActive && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/50">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 mb-4">{user.email}</p>

                    {/* Roles */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {user.roles.map((roleObj, idx) => (
                        <div
                          key={idx}
                          className={`px-3 py-1 text-sm rounded-full border flex items-center gap-2 ${getRoleBadgeColor(
                            roleObj.role
                          )}`}
                        >
                          <span>{roleObj.role}</span>
                          <button
                            onClick={() => handleRemoveRole(user._id, roleObj.role)}
                            className="hover:text-white transition-colors"
                            title="Remove role"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="px-4 py-2 bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 rounded-lg transition-all text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="px-4 py-2 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded-lg transition-all text-sm"
                    >
                      + Add Role
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">
              Add Role to {selectedUser.firstName} {selectedUser.lastName}
            </h2>
            <p className="text-gray-400 mb-6">{selectedUser.email}</p>

            <div className="space-y-2 mb-6">
              {roleOptions.map((role) => {
                const hasRole = selectedUser.roles.some((r) => r.role === role);
                return (
                  <button
                    key={role}
                    onClick={() => handleAddRole(role)}
                    disabled={hasRole}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      hasRole
                        ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                        : 'bg-dark-700 border-gray-600 hover:border-neon-blue hover:bg-dark-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{role}</span>
                      {hasRole && <span className="text-xs text-gray-500">Already assigned</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
              }}
              className="w-full py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Edit User</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-dark-700 text-neon-blue focus:ring-neon-blue"
                  />
                  <span>Account Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex-1 py-3 bg-neon-blue hover:bg-neon-blue/80 rounded-lg font-medium disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Users Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-lg w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2">Add Users</h2>
            <p className="text-gray-400 text-sm mb-6">
              Pre-register emails with roles. When someone signs up with a listed email, they'll automatically be assigned the role and added to the hackathon.
              <span className="block mt-1 text-xs text-gray-500">No emails are sent - users must sign up themselves.</span>
            </p>

            {/* Session Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Hackathon Session *</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
              >
                <option value="">-- Select a session --</option>
                {sessions.map(session => (
                  <option key={session._id} value={session._id}>
                    {session.title} {session.status === 'active' ? '(Active)' : `(${session.status})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Role</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInviteRole('fellow')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                    inviteRole === 'fellow'
                      ? 'border-neon-green bg-neon-green/20 text-neon-green'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  🎓 Fellow
                </button>
                <button
                  onClick={() => setInviteRole('judge')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                    inviteRole === 'judge'
                      ? 'border-neon-purple bg-neon-purple/20 text-neon-purple'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  ⚖️ Judge
                </button>
              </div>
            </div>

            {/* Input Mode Toggle */}
            <div className="mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setInviteMode('single')}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-all text-sm ${
                    inviteMode === 'single'
                      ? 'border-neon-blue bg-neon-blue/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  Single Email
                </button>
                <button
                  onClick={() => setInviteMode('bulk')}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-all text-sm ${
                    inviteMode === 'bulk'
                      ? 'border-neon-blue bg-neon-blue/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  Bulk (Multiple)
                </button>
              </div>
            </div>

            {/* Email Input */}
            {inviteMode === 'single' ? (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      value={singleFirstName}
                      onChange={(e) => setSingleFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      value={singleLastName}
                      onChange={(e) => setSingleLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Email Addresses (one per line, or comma/semicolon separated)
                </label>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                  rows={6}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none resize-none font-mono text-sm"
                />
              </div>
            )}

            {/* Result Display */}
            {inviteResult && (
              <div className={`mb-4 p-4 rounded-lg border ${
                inviteResult.errors.length > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50'
              }`}>
                <p className="font-medium">
                  ✓ {inviteResult.added} email{inviteResult.added !== 1 ? 's' : ''} added to roster
                  {inviteResult.skipped > 0 && `, ${inviteResult.skipped} skipped (already exists)`}
                </p>
                {inviteResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-400">
                    {inviteResult.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteResult(null);
                  setSingleEmail('');
                  setBulkEmails('');
                }}
                className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                {inviteResult ? 'Done' : 'Cancel'}
              </button>
              <button
                onClick={handleInviteUsers}
                disabled={inviting || !selectedSession || (inviteMode === 'single' ? !singleEmail.trim() : !bulkEmails.trim())}
                className="flex-1 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {inviting ? 'Adding...' : 'Add to Roster'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersManagement() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <UsersManagementContent />
    </RoleGuard>
  );
}
