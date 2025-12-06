import { UserRole, Timestamps } from './common';
export interface User extends Timestamps {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash?: string;
    roles: UserRoleAssignment[];
    lastLogin?: Date;
    isActive: boolean;
    emailVerified: boolean;
}
export interface UserRoleAssignment {
    role: UserRole;
    organizationId: string;
    cohortId?: string;
}
export interface Organization extends Timestamps {
    _id: string;
    name: string;
    slug: string;
    cohorts: Cohort[];
    settings: OrganizationSettings;
}
export interface Cohort {
    _id: string;
    name: string;
    year: number;
    startDate?: Date;
    endDate?: Date;
}
export interface OrganizationSettings {
    allowSelfRegistration: boolean;
    defaultRetakePolicy: 'none' | 'once-with-penalty' | 'unlimited';
    defaultLatePolicy: LatePolicySettings;
    timezone: string;
}
export interface LatePolicySettings {
    enabled: boolean;
    sameDayDeadline?: string;
    weekendDeadline?: string;
    penaltyPercentage?: number;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface AuthUser {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRoleAssignment[];
}
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface RegisterData extends LoginCredentials {
    firstName: string;
    lastName: string;
    organizationId?: string;
}
//# sourceMappingURL=user.d.ts.map