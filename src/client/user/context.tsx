import { type ParentProps } from 'solid-js'
import { User } from '../../server/users/types'
import { optionalContext } from '../util/context'

const { use: useUser, Provider: UserProvider } = optionalContext(
  (props: ParentProps & { user: User }) => props.user,
)

export { useUser, UserProvider }
