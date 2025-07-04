import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Star, Trophy } from "lucide-react";
import { format } from "date-fns";
import type { Credential } from "@shared/schema";

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

  const getCredentialColor = (type: string) => {
    switch (type) {
      case 'sticker':
        return 'credential-badge';
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

  if (showDetails) {
    return (
      <Card className="card-hover apple-shadow border-0">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={`${getCredentialColor(credential.type)} rounded-full flex items-center justify-center ${getSizeClasses(size)}`}>
              <Icon className="text-white" />
            </div>
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
                  {format(new Date(credential.awardedAt), 'MMM d, yyyy')}
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
      <div className={`${getCredentialColor(credential.type)} rounded-full flex items-center justify-center ${getSizeClasses(size)}`}>
        <Icon className="text-white" />
      </div>
      {size !== 'sm' && (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {credential.title}
          </p>
          <p className="text-xs text-gray-600">
            {credential.type} • {format(new Date(credential.awardedAt), 'MMM d')}
          </p>
        </div>
      )}
    </div>
  );
}
