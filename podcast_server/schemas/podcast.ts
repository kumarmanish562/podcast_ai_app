import { graphql, list } from '@keystone-6/core';
import { relationship, select, text, virtual } from '@keystone-6/core/fields';

export const Podcast = list({
  access: {
    operation: {
      query: () => true,
      create: () => true,
      update: ({ session }) => !!session,
      delete: ({ session }) => !!session,
    },
  },
  fields: {
    title: text({ validation: { isRequired: true } }),
    audio_uri: text(),
    video_uri: text(),
    artwork: text(),
    lyricist: text(),
    category: text(),
    type: select({
      options: [
        { label: 'Audio', value: 'audio' },
        { label: 'Video', value: 'video' },
      ],
      defaultValue: 'audio',
      validation: { isRequired: true },
    }),
    artist: relationship({ ref: "Artist" }),
    favoritedBy: relationship({
      ref: "User.favoritesPodcasts",
      many: true,
    }),
    favoritedCount: virtual({
      field: graphql.field({
        type: graphql.Int,
        resolve: async (item, _args, context) => {
          const count = await context.db.User.count({
            where: {
              favoritesPodcasts: {
                some: { id: { equals: item.id } },
              },
            },
          });
          return count;
        },
      }),
    }),
  },
});