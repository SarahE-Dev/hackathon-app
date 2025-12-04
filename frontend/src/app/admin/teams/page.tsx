'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { teamsAPI, usersAPI } from '@/lib/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Array<{ role: string }>;
}

interface Team {
  _id: string;
  name: string;
  memberIds: User[];
  projectTitle?: string;
  track?: string;
}

function AdminTeamsContent() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedUser, setDraggedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsRes, usersRes] = await Promise.all([
        teamsAPI.getAllTeams(),
        usersAPI.getAllUsers(),
      ]);
      
      // Teams come back in response.data.teams format
      const teamsData = teamsRes?.data?.teams || teamsRes?.teams || teamsRes || [];
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      
      // Filter to only fellow users
      const usersData = Array.isArray(usersRes) ? usersRes : [];
      const fellows = usersData.filter((u: User) => 
        u.roles?.some(r => r.role === 'fellow')
      );
      setAllUsers(fellows);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get users who aren't in any team
  const unassignedUsers = allUsers.filter(user => 
    !teams.some(team => 
      team.memberIds?.some(member => 
        (typeof member === 'string' ? member : member._id) === user._id
      )
    )
  );

  // Filter unassigned users by search
  const filteredUnassigned = unassignedUsers.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const handleDragStart = (user: User) => {
    setDraggedUser(user);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnTeam = async (teamId: string) => {
    if (!draggedUser) return;
    
    setSaving(true);
    try {
      await teamsAPI.addMember(teamId, draggedUser._id);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to add user to team');
    } finally {
      setSaving(false);
      setDraggedUser(null);
    }
  };

  const handleDropOnUnassigned = async () => {
    if (!draggedUser) return;
    
    // Find which team the user is in
    const currentTeam = teams.find(team =>
      team.memberIds?.some(member =>
        (typeof member === 'string' ? member : member._id) === draggedUser._id
      )
    );
    
    if (currentTeam) {
      setSaving(true);
      try {
        await teamsAPI.removeMember(currentTeam._id, draggedUser._id);
        await loadData();
      } catch (error: any) {
        alert(error.response?.data?.error?.message || 'Failed to remove user from team');
      } finally {
        setSaving(false);
      }
    }
    setDraggedUser(null);
  };

  const handleRemoveFromTeam = async (teamId: string, userId: string) => {
    if (!confirm('Remove this user from the team?')) return;
    
    setSaving(true);
    try {
      await teamsAPI.removeMember(teamId, userId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to remove user');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    
    setSaving(true);
    try {
      await teamsAPI.createTeam({ name: newTeamName.trim() });
      setNewTeamName('');
      setShowCreateModal(false);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Delete this team? Members will become unassigned.')) return;
    
    setSaving(true);
    try {
      await teamsAPI.deleteTeam(teamId);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete team');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading teams...</p>
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
              <h1 className="text-3xl font-bold text-gradient">Team Management</h1>
              <p className="text-gray-400 mt-1">Drag and drop fellows to assign them to teams</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 rounded-lg font-medium transition-all"
              >
                + New Team
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
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-neon-blue/20">
            <p className="text-3xl font-bold text-neon-blue">{teams.length}</p>
            <p className="text-sm text-gray-400">Teams</p>
          </div>
          <div className="glass rounded-xl p-4 border border-neon-green/20">
            <p className="text-3xl font-bold text-neon-green">{allUsers.length}</p>
            <p className="text-sm text-gray-400">Total Fellows</p>
          </div>
          <div className="glass rounded-xl p-4 border border-neon-purple/20">
            <p className="text-3xl font-bold text-neon-purple">{allUsers.length - unassignedUsers.length}</p>
            <p className="text-sm text-gray-400">Assigned</p>
          </div>
          <div className="glass rounded-xl p-4 border border-yellow-500/20">
            <p className="text-3xl font-bold text-yellow-400">{unassignedUsers.length}</p>
            <p className="text-sm text-gray-400">Unassigned</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unassigned Fellows */}
          <div
            className={`glass rounded-xl border-2 p-4 min-h-[500px] transition-all ${
              draggedUser && teams.some(t => t.memberIds?.some(m => (typeof m === 'string' ? m : m._id) === draggedUser._id))
                ? 'border-dashed border-yellow-500 bg-yellow-500/5'
                : 'border-gray-700'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnassigned}
          >
            <h3 className="font-bold mb-3 flex items-center gap-2 text-lg">
              <span className="text-2xl">👤</span>
              Unassigned Fellows ({filteredUnassigned.length})
            </h3>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search fellows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg mb-4 text-sm focus:border-neon-blue focus:outline-none"
            />
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredUnassigned.map((user) => (
                <div
                  key={user._id}
                  draggable
                  onDragStart={() => handleDragStart(user)}
                  className="p-3 bg-dark-700 rounded-lg cursor-grab hover:bg-dark-600 transition-all border border-gray-600 hover:border-neon-blue/50"
                >
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              ))}
              {filteredUnassigned.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? 'No fellows match search' : 'All fellows assigned to teams! 🎉'}
                </p>
              )}
            </div>
          </div>

          {/* Teams */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => {
                const members = team.memberIds || [];
                return (
                  <div
                    key={team._id}
                    className={`glass rounded-xl border-2 p-4 min-h-[200px] transition-all ${
                      draggedUser && !members.some(m => (typeof m === 'string' ? m : m._id) === draggedUser._id)
                        ? 'border-dashed border-neon-blue bg-neon-blue/5'
                        : 'border-gray-700'
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnTeam(team._id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-neon-blue text-lg">{team.name}</h4>
                      <button
                        onClick={() => handleDeleteTeam(team._id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-500/10 rounded"
                        title="Delete team"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    {team.track && (
                      <span className="inline-block px-2 py-0.5 bg-neon-purple/20 text-neon-purple text-xs rounded-full mb-3">
                        {team.track}
                      </span>
                    )}
                    
                    <div className="space-y-2">
                      {members.map((member) => {
                        const user = typeof member === 'string' 
                          ? allUsers.find(u => u._id === member)
                          : member;
                        if (!user) return null;
                        
                        return (
                          <div
                            key={user._id}
                            draggable
                            onDragStart={() => handleDragStart(user)}
                            className="p-2 bg-dark-700 rounded cursor-grab hover:bg-dark-600 transition-all flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveFromTeam(team._id, user._id)}
                              className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              title="Remove from team"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      {members.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">
                          Drag fellows here
                        </p>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-700">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
              
              {teams.length === 0 && (
                <div className="md:col-span-2 glass rounded-xl p-12 text-center border border-gray-700">
                  <div className="text-5xl mb-4">👥</div>
                  <h3 className="text-xl font-bold mb-2">No Teams Yet</h3>
                  <p className="text-gray-400 mb-4">Create teams and drag fellows to assign them.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2 bg-neon-green hover:bg-neon-green/80 rounded-lg font-medium"
                  >
                    Create First Team
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Create New Team</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., Team Alpha"
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:border-neon-blue focus:outline-none"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTeamName('');
                }}
                className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={saving || !newTeamName.trim()}
                className="flex-1 py-3 bg-neon-green hover:bg-neon-green/80 rounded-lg font-medium disabled:opacity-50 transition-all"
              >
                {saving ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-neon-blue/20 border border-neon-blue/50 rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-neon-blue border-t-transparent"></div>
          <span className="text-sm">Saving...</span>
        </div>
      )}
    </div>
  );
}

export default function AdminTeamsPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AdminTeamsContent />
    </RoleGuard>
  );
}

