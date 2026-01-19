import { untrack } from 'solid-js'
import { User, UserProfile } from '../../server/users/types'
import { SignalStore } from '../data/signalStore'
import { TrpcAppClient } from '../data/trpc'
import { unwrap } from 'solid-js/store'
import { withRollback } from '../util/functions'

export interface UserSignals {
  isLoading: boolean
  self: User | null
}

export class UserStore extends SignalStore<UserSignals> {
  constructor(
    private trpc: TrpcAppClient,
    init: Promise<User>,
  ) {
    super({ self: null, isLoading: false })

    this.setStore('isLoading', true)
    init.then((self) => {
      this.setStore({
        self,
        isLoading: false,
      })
    })
  }

  get isLoading(): boolean {
    return this.store.isLoading
  }

  get self(): User | null {
    return this.store.self
  }

  async updateProfile(profile: UserProfile) {
    const current = untrack(() => unwrap(this.store.self))
    if (!current) {
      throw Error('self not found, cannot update')
    }

    this.setStore('self', 'profile', profile)

    withRollback(
      async () => {
        this.setStore('self', 'profile', profile)
        await this.trpc.users.updateProfile.mutate(profile)
      },
      async () => {
        this.setStore('self', 'profile', current.profile)
      },
    )
  }
}
