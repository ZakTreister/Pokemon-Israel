export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  createdBy: {
    id: string;
    username: string;
    name: string;
  };
}

export interface BadgeAward {
  id: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
  };
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    isActive: boolean;
  };
  awardedAt: string;
  awardedBy: {
    id: string;
    username: string;
    name: string;
  };
}

export interface CreateBadgeInput {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateBadgeInput {
  name?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}
