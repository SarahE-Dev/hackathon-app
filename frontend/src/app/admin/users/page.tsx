'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Plus, Edit2, Trash2, UserPlus, Shield, X, Search } from 'lucide-react';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{
    role: string;
    organizationId: string;
    cohortId?: string;
  }>;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface CreateUserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function UserManagementPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'applicant',
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    isActive: true,
    emailVerified: false,
  });

  // Check admin access
  useEffect(() => {
    if (!user || !user.roles?.some((r: any) => r.role === 'admin')) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (roleFilter) {
        params.role = roleFilter;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );

      setUsers(response.data.data.users);
      setTotalPages(response.data.data.pagination.totalPages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/users`,
        createForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowCreateModal(false);
      setCreateForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'applicant',
      });
      fetchUsers();
      alert('User created successfully!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/users/${selectedUser._id}`,
        editForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
      alert('User updated successfully!');
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/users/${selectedUser._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
      alert('User deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gradient">User Management</h1>
            <p className="text-gray-400 mt-2">Manage users, roles, and permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:opacity-90 transition-all glow-blue"
          >
            <Plus className="w-5 h-5" />
            Create User
          </button>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-6 mb-6 border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="proctor">Proctor</option>
              <option value="judge">Judge</option>
              <option value="applicant">Applicant/Fellow</option>
            </select>

            {/* Stats */}
            <div className="flex items-center gap-2 text-gray-400">
              <span className="font-semibold text-neon-blue">{users.length}</span>
              <span>users found</span>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Roles</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Joined</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-dark-700 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-400">ID: {user._id.slice(-8)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role, idx) => (
                          <span
                            key={idx}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              role.role === 'admin'
                                ? 'bg-red-500/20 text-red-400'
                                : role.role === 'proctor'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : role.role === 'judge'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {role.role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium inline-block w-fit ${
                            user.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.emailVerified && (
                          <span className="text-xs text-green-400">✓ Verified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4 text-neon-blue" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-all"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New User</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Initial Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                >
                  <option value="applicant">Applicant/Fellow</option>
                  <option value="proctor">Proctor</option>
                  <option value="judge">Judge</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg hover:bg-dark-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:opacity-90 transition-all"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit User</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-400">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.emailVerified}
                    onChange={(e) => setEditForm({ ...editForm, emailVerified: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-400">Email Verified</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg hover:bg-dark-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:opacity-90 transition-all"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-4">Delete User</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">
                {selectedUser.firstName} {selectedUser.lastName}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg hover:bg-dark-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
