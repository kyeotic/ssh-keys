import { JSX, Show } from 'solid-js'
import { useStores } from '../data/stores'
import ProfileEdit from './ProfileEdit'
import { UserProfile } from '../../server/users/types'
import { PageLoader } from '../components'

export default function ProfilePage(): JSX.Element {
  const { user: store } = useStores()

  function handleSave(profile: UserProfile) {
    store.updateProfile(profile)
  }

  return (
    <Show when={!store.isLoading} fallback={<PageLoader />}>
      <ProfileEdit profile={store.self!.profile} onSave={handleSave} />
    </Show>
  )
}
