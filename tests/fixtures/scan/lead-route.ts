import { z } from 'zod';
const Lead = z.object({ email: z.string().email() });
router.post('/webhooks/lead', verifySignature, async (req, res) => {
  const lead = Lead.parse(req.body);
  await prisma.lead.upsert({ where: { email: lead.email }, create: lead, update: lead });
  res.sendStatus(200);
});
