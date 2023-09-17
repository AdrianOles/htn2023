import { NextApiRequest, NextApiResponse } from 'next';
const speech = require('@google-cloud/speech');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { audioFile } = req.body; // Assuming you send the audio file in the request body
        const audioToSubmit = audioFile.substring("data:audio/webm;base64,".length);

        try {
            const client = new speech.SpeechClient();
            const audio = {
                content: audioToSubmit,
            };
            const config = {
                encoding: 'Vorbis Audio Codec' as const, // Use 'as const' to specify a literal string type
                sampleRateHertz: 48000,
                languageCode: 'en-US',
            };
            const request = {
                audio: audio,
                config: config,
            };

            const [response] = await client.recognize(request);

            res.status(200).json(response);
        } catch (error) {
            console.error('Error recognizing audio:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(405).end(); // Method Not Allowed
    }
}