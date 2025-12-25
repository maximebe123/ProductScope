import { memo } from 'react'

interface UserProfileProps {
  isCollapsed: boolean
  firstName?: string
  lastName?: string
  avatarUrl?: string
}

const UserProfile = memo(function UserProfile({
  isCollapsed,
  firstName = 'Jonathan',
  lastName = 'Cohen',
  avatarUrl = 'https://media.gqmagazine.fr/photos/64b9498193010afab4ecf28a/16:9/w_2336,h_1314,c_limit/Jonathan%20Cohen%20-%20Sentinelle.png',
}: UserProfileProps) {
  return (
    <div
      className={`
        border-t border-gray-200 bg-gray-50/50
        transition-all duration-300
        ${isCollapsed ? 'p-2 flex justify-center' : 'p-3'}
      `}
    >
      <div
        className={`
          flex items-center
          ${isCollapsed ? 'justify-center' : 'gap-3'}
        `}
      >
        {/* Avatar with yellow border */}
        <div
          className="relative flex-shrink-0 rounded-full p-[3px] bg-secondary"
        >
          <div
            className={`
              rounded-full overflow-hidden bg-white
              ${isCollapsed ? 'w-9 h-9' : 'w-10 h-10'}
            `}
          >
            <img
              src={avatarUrl}
              alt={`${firstName} ${lastName}`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name - only when expanded */}
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">Mon profil</p>
          </div>
        )}
      </div>
    </div>
  )
})

export default UserProfile
