import { mergeSchemas } from '@graphql-tools/schema';
import axios from 'axios';
import { gql } from 'graphql-tag';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY = process.env.GEMINI_API_KEY;

export const extendGraphqlSchema = (schema: any) =>
  mergeSchemas({
    schemas: [schema],
    typeDefs: gql`
      type RegistrationResponse {
        user: User
      }

      type podcastRecommendation {
        id: ID!
        title: String!
        category: String!
        video_uri: String
        artwork: String
        lyricist: String
        audio_uri: String
        type: String!
        artist: ArtistInfo
        isFavorited: Boolean!
      }

      type ArtistInfo {
        id: ID!
        name: String!
        bio: String
        photo: String
      }

      extend type Mutation {
        registerUser(
          name: String!
          email: String!
          password: String!
        ): RegistrationResponse
      }

      extend type Query {
        getRecommendedPodcasts(userId: ID!): [podcastRecommendation]
      }
    `,
    resolvers: {
      Mutation: {
        registerUser: async (_, { name, email, password }, context) => {
          const existingUser = await context.db.User.findOne({
            where: { email },
          });
          if (existingUser) {
            throw new Error('User with this email already exists.');
          }
          const newUser = await context.db.User.createOne({
            data: { name, email, password },
          });
          return { user: newUser };
        },
      },
      Query: {
        getRecommendedPodcasts: async (_, { userId }, context) => {
          try {
            const user = await context.db.User.findOne({
              where: { id: userId },
              query: `id favoritesPodcasts { id title category }`,
            });

            if (!user) {
              throw new Error('User not found.');
            }

            const favoritesPodcasts = user.favoritesPodcasts || [];

            const favouriteCategories = [
              ...new Set(
                favoritesPodcasts.map((p: { category: string }) => p.category)
              ),
            ];

            const allPodcasts = await context.db.Podcast.findMany({
              query: `id title category video_uri artwork lyricist audio_uri type artist { id name bio photo }`,
            });

            const favoritesPodcastsIds = favoritesPodcasts.map(
              (p: { id: string }) => p.id
            );
            const availablePodcasts = allPodcasts.filter(
              (p: any) => !favoritesPodcastsIds.includes(p.id)
            );

            if (availablePodcasts.length === 0) {
              return [];
            }

            const prompt = `You are an AI podcast recommendation system. The user has listened to these categories: ${
              favouriteCategories.length
                ? favouriteCategories.join(', ')
                : 'None'
            }
                          From the following available Podcasts, suggest 3 that match their interests: ${
              availablePodcasts.length
                ? availablePodcasts
                    .map(
                      (p: any) =>
                        `${p.title} (${p.category}, Artist: ${p?.artist?.name})`
                    )
                    .join(', ')
                : 'No podcasts available'
            }

                      Return only the titles in this JSON format:
        {
          "recommendations": ["title 1", "title 2", "title 3"]
        }
                }`;

            const response = await axios.post(
              `${GEMINI_API_URL}?key=${API_KEY}`,
              {
                contents: [
                  {
                    parts: [{ text: prompt }],
                  },
                ],
              },
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );

            const aiResponse =
              response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

            const jsonMatch = aiResponse.match(/```json\n([\s\S]+?)\n```/);
            if (!jsonMatch) {
              throw new Error('Could not parse AI response JSON.');
            }

            const jsonString = jsonMatch[1];
            const { recommendations } = JSON.parse(jsonString);

            if (!Array.isArray(recommendations)) {
              throw new Error(
                'Invalid response format from AI recommendation system.'
              );
            }

            const matchedPodcasts = allPodcasts.filter((p: any) =>
              recommendations.includes(p.title)
            );

            const podcastWithArtist = matchedPodcasts.map((podcast: any) => ({
              ...podcast,
              artist: {
                bio: 'AI-generated suggestion from your favourite and similar podcasts.',
                id: 123,
                name: 'AI Generated Artist',
                photo: 'https://example.com/artist-photo.jpg',
              },
            }));

            return podcastWithArtist;
          } catch (error) {
            console.error('Error fetching recommended podcasts:', error);
            throw new Error('Failed to fetch recommended podcasts.');
          }
        },
      },
    },
  });
