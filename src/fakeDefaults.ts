import {SanityDocument} from '@sanity/client'

export const DEFAULT_API_VERSION = 'v1'
export const DEFAULT_DATASET = 'fake'
export const DEFAULT_PROJECT_ID = 'fake'

export const DEFAULT_FAKE_RESOURCES: Record<string, any> = {
  '/auth/providers': {
    thirdPartyLogin: true,
    sso: {saml: true},
    providers: [
      {name: 'google', title: 'Google', url: 'https://api.sanity.io/v1/auth/login/google'},
      {name: 'github', title: 'GitHub', url: 'https://api.sanity.io/v1/auth/login/github'},
      {
        name: 'sanity',
        title: 'E-mail / password',
        url: 'https://api.sanity.io/v1/auth/login/sanity',
      },
    ],
  },

  '/users/me': {
    id: 'grrm',
    name: 'George R.R. Martin',
    email: 'george@sanity.io',
    profileImage: 'https://i.hurimg.com/i/hdn/75/0x0/59c94dee45d2a027e83d45f2.jpg',
    role: 'administrator',
    roles: [
      {
        name: 'administrator',
        title: 'Administrator',
        description:
          'Read and write access to all datasets, with full access to all project settings.',
      },
    ],
    provider: 'google',
  },

  '/projects/<project-id>/datasets/<dataset>/acl': [
    {permissions: ['history', 'read', 'update', 'create'], filter: '_id in path("**")'},
    {
      filter: '(_id in path("**")) && _id in path("drafts.**")',
      permissions: ['history', 'read', 'update', 'create'],
    },
    {filter: '_id in path("*")', permissions: ['read']},
  ],
}

export const DEFAULT_DOCUMENTS: SanityDocument[] = []
