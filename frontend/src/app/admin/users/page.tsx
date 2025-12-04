'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { usersAPI } from '@/lib/api';

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

function UsersManagementContent() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

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
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

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
      admin: users.filter((u) => u.roles.some((r) => r.role === 'admin')).length,
      judge: users.filter((u) => u.roles.some((r) => r.role === 'judge')).length,
      proctor: users.filter((u) => u.roles.some((r) => r.role === 'proctor')).length,
      grader: users.filter((u) => u.roles.some((r) => r.role === 'grader')).length,
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
            <Link
              href="/admin"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Users</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-red-500/30">
            <div className="text-gray-400 text-sm mb-1">Admins</div>
            <div className="text-2xl font-bold text-red-400">{stats.admin}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-purple-500/30">
            <div className="text-gray-400 text-sm mb-1">Judges</div>
            <div className="text-2xl font-bold text-purple-400">{stats.judge}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-orange-500/30">
            <div className="text-gray-400 text-sm mb-1">Proctors</div>
            <div className="text-2xl font-bold text-orange-400">{stats.proctor}</div>
          </div>
          <div className="glass rounded-xl p-4 border border-blue-500/30">
            <div className="text-gray-400 text-sm mb-1">Graders</div>
            <div className="text-2xl font-bold text-blue-400">{stats.grader}</div>
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

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center border border-gray-800">
              <p className="text-gray-400 text-lg">No users found</p>
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
                      {!user.emailVerified && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/50">
                          Unverified
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

                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowRoleModal(true);
                    }}
                    className="px-4 py-2 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded-lg transition-all"
                  >
                    + Add Role
                  </button>
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
