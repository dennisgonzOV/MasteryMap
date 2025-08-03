import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Star, Trophy } from "lucide-react";
import { format } from "date-fns";
import type { Credential } from "@shared/schema";
import StickerIcon from "./sticker-icon";

interface CredentialBadgeProps {
  credential: Credential;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function CredentialBadge({ 
  credential, 
  size = 'md', 
  showDetails = false 
}: CredentialBadgeProps) {
  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'sticker':
        return Star;
      case 'badge':
        return Award;
      case 'plaque':
        return Trophy;
      default:
        return Award;
    }
  };

  const getCredentialColor = (type: string, title?: string, iconUrl?: string) => {
    if (type === 'sticker') {
      if (title?.toLowerCase().includes('emerging')) {
        return 'credential-badge red';
      } else if (title?.toLowerCase().includes('developing')) {
        return 'credential-badge yellow';
      } else if (title?.toLowerCase().includes('proficient')) {
        return 'credential-badge blue';
      } else if (title?.toLowerCase().includes('applying')) {
        return 'credential-badge green';
      } else {
        return 'credential-badge';
      }
    }
    switch (type) {
      case 'badge':
        return 'credential-badge gold';
      case 'plaque':
        return 'credential-badge silver';
      default:
        return 'credential-badge';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 text-xs';
      case 'lg':
        return 'w-12 h-12 text-lg';
      default:
        return 'w-8 h-8 text-sm';
    }
  };

  const Icon = getCredentialIcon(credential.type);

  const renderIcon = () => {
    if (credential.type === 'sticker' && credential.iconUrl) {
      const iconSize = size === 'sm' ? 24 : size === 'lg' ? 48 : 32;
      return (
        <StickerIcon 
          level={credential.iconUrl as 'red' | 'yellow' | 'blue' | 'green'} 
          size={iconSize}
        />
      );
    } else {
      return (
        <div className={`${getCredentialColor(credential.type, credential.title, credential.iconUrl || undefined)} rounded-full flex items-center justify-center ${getSizeClasses(size)}`}>
          <Icon className="text-white" />
        </div>
      );
    }
  };

  if (showDetails) {
    return (
      <Card className="card-hover apple-shadow border-0">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {renderIcon()}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-sm">
                {credential.title}
              </h4>
              <p className="text-xs text-gray-600 mb-1">
                {credential.description}
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {credential.type}
                </Badge>
                <span className="text-xs text-gray-500">
                  {credential.awardedAt ? format(new Date(credential.awardedAt), 'MMM d, yyyy') : 'No date'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {renderIcon()}
      {size !== 'sm' && (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {credential.title}
          </p>
          <p className="text-xs text-gray-600">
            {credential.type} • {credential.awardedAt ? format(new Date(credential.awardedAt), 'MMM d') : 'No date'}
          </p>
        </div>
      )}
    </div>
  );
}