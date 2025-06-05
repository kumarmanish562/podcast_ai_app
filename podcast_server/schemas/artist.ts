import { list } from "@keystone-6/core";
import { text } from "@keystone-6/core/fields";

export const Artist = list({
  access: {
    operation: {
      query: () => true,
      create: () => true,
      update: (session) =>  !!session,
      delete: (session) => !!session,
    },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
   bio:text(),
  photo: text(),
  },
})