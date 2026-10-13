export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  image?: string;
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
    image?: string;
    isActive: boolean;
  };
  season?: { id?: string; name: string } | null;
  awardedAt: string;
  awardedBy: {
    id: string;
    username: string;
    name: string;
  };
}

export interface CreateBadgeInput {
  imageUploadId?: string | null;
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateBadgeInput {
  imageUploadId?: string | null;
  name?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}
