import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

export async function createStripeCustomer(tenantId: string, email: string, name: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        tenantId,
      },
    });

    // Save Stripe customer ID to tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    throw error;
  }
}

export async function createStripeSubscription(
  tenantId: string,
  priceId: string,
  trialDays?: number
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripeCustomerId: true },
    });

    if (!tenant?.stripeCustomerId) {
      throw new Error('Tenant has no Stripe customer ID');
    }

    const subscription = await stripe.subscriptions.create({
      customer: tenant.stripeCustomerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays || 14,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw error;
  }
}

export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: subscription.id,
      plan: subscription.items.data[0]?.price?.metadata?.plan || 'STANDARD',
      status: subscription.status === 'active' ? 'ACTIVE' : 'TRIAL',
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan: subscription.items.data[0]?.price?.metadata?.plan || 'STANDARD',
      status: subscription.status === 'active' ? 'ACTIVE' : 'SUSPENDED',
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'CANCELLED',
      stripeSubscriptionId: null,
    },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const tenantId = invoice.subscription
    ? (await stripe.subscriptions.retrieve(invoice.subscription as string)).metadata?.tenantId
    : null;

  if (!tenantId) return;

  // Log successful payment for analytics
  console.log(`Payment succeeded for tenant ${tenantId}: ${invoice.amount_paid}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const tenantId = invoice.subscription
    ? (await stripe.subscriptions.retrieve(invoice.subscription as string)).metadata?.tenantId
    : null;

  if (!tenantId) return;

  // Send alert to tenant
  console.error(`Payment failed for tenant ${tenantId}: ${invoice.number}`);

  // TODO: Send email notification
}

export const STRIPE_PLANS = {
  STARTER: {
    priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    name: 'Starter',
    price: 29,
    maxUsers: 5,
    maxEntriesPerMonth: 1000,
    features: ['Basic reporting', 'Email support'],
  },
  STANDARD: {
    priceId: process.env.STRIPE_PRICE_STANDARD_MONTHLY || '',
    name: 'Standard',
    price: 79,
    maxUsers: 25,
    maxEntriesPerMonth: 10000,
    features: ['Advanced reporting', 'API access', 'Priority support'],
  },
  PROFESSIONAL: {
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    name: 'Professional',
    price: 199,
    maxUsers: 100,
    maxEntriesPerMonth: 50000,
    features: ['Custom integrations', 'Dedicated support', 'SLA'],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 'Custom',
    maxUsers: 'Unlimited',
    maxEntriesPerMonth: 'Unlimited',
    features: ['Everything in Professional', 'Custom deployment'],
  },
};
