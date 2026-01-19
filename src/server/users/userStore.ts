import {
  batchGet,
  listAllValues,
  makeSet,
  upsert,
  associativeIndex,
  singularIndex,
} from '@kyeotic/server/kv'
import { Token } from '@kyeotic/server'
import config from '../config.ts'
import { nanoid } from 'nanoid'
import { ExternalId, User, UserProfile } from './types.ts'

export const USERS = makeSet('USERS')
const USERNAMES = makeSet('USERNAMES')

const EXT_ID = makeSet('EX_ID') // external identifier
const AUTH0_SOURCE = 'auth0-kyeotek'

interface ExternalIdRef {
  userId: string
}

const externalIndex = associativeIndex(
  (_: User, ext: ExternalId) => EXT_ID(ext.source, ext.id),
  (u: User) => u.externalIds,
  (u: User) => ({ userId: u.id }),
)

const usernameIndex = singularIndex(
  (u: User) => (u.profile.username ? USERNAMES(u.profile.username) : null),
  (u: User) => u.profile?.username ?? null,
  (u: User) => ({ userId: u.id }),
)

export default class UserStore {
  constructor(private readonly kv: Deno.Kv) {}

  // TODO: replace this with a paging function
  async getAll(): Promise<User[]> {
    return await listAllValues(this.kv, USERS())
  }

  async get(userId: string): Promise<User | null> {
    return (await this.kv.get<User>(USERS(userId)))?.value
  }

  async batchGet(userIds: string[]): Promise<User[]> {
    return await batchGet(
      this.kv,
      userIds.map((u) => USERS(u)),
    )
  }

  async create(user: User): Promise<User> {
    if (!user.id) throw new Error('id is required')

    const key = USERS(user.id)
    const existing = await this.kv.get(key)

    if (existing?.versionstamp) {
      throw new Error('User already exists')
    }

    const txn = this.kv
      .atomic()
      .check({ key, versionstamp: null })
      .set(key, user)

    externalIndex(txn, user, null)
    usernameIndex(txn, user, null)

    await txn.commit()

    return user
  }

  async initUser(token: Token): Promise<User> {
    if (token.iss !== config.auth.issuer)
      throw new Error('Unsupported external source')

    const externalId = token.sub

    const dbUser = await this.getByExternalIdentifier(AUTH0_SOURCE, externalId)
    if (dbUser) return dbUser

    console.log('creating new user')

    const newUser: User = {
      id: nanoid(),
      externalIds: [{ source: AUTH0_SOURCE, id: externalId }],
      profile: {
        email: null,
        username: null,
      },
    }

    await this.create(newUser)

    return newUser
  }

  async update(user: User): Promise<User> {
    if (!user.id) throw new Error('id is required')

    const key = USERS(user.id)
    const existing = await this.kv.get<User>(key)

    if (!existing.value) {
      throw new Error('User not found')
    }

    const txn = await this.kv.atomic().check(existing).set(key, user)

    externalIndex(txn, user, existing.value)
    usernameIndex(txn, user, existing.value)

    await txn.commit()

    return user
  }

  async updateProfile(userId: string, profile: UserProfile): Promise<void> {
    await upsert<User>(this.kv, USERS(userId), (dbUser) => {
      if (!dbUser) throw new Error('user does not exist')

      return { ...dbUser, profile }
    })
  }

  async getByExternalIdentifier(
    source: string,
    externalId: string,
  ): Promise<User | null> {
    const dbId = await this.kv.get(EXT_ID(source, externalId))
    if (!dbId.value) return null

    const user = await this.kv.get(USERS((dbId.value as ExternalIdRef).userId))

    return (user.value as User) ?? null
  }

  async getByUsername(username: string): Promise<User | null> {
    const { value: dbRef } = await this.kv.get<ExternalIdRef>(
      USERNAMES(username),
    )
    if (!dbRef) return null

    const user = await this.kv.get<User>(USERS(dbRef.userId))
    return (user.value as User) ?? null
  }
}
