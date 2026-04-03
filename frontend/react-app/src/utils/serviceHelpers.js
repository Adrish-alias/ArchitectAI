export function getServiceBadgeClass(name) {
  const n = name.toLowerCase();
  if (n.includes('cognito')) return 'sc';
  if (n.includes('lambda')) return 'sb2';
  if (n.includes('s3')) return 'sg';
  if (n.includes('dynamodb')) return 'sm';
  if (n.includes('ecs')) return 'sb2';
  if (n.includes('elasticache')) return 'sc';
  if (n.includes('sqs')) return 'sg';
  if (n.includes('opensearch')) return 'sm';
  if (n.includes('cloudfront')) return 'sgrn';
  if (n.includes('api gateway')) return 'sgrn';
  return 'sc';
}

export function getServiceIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('cognito')) return '🔐';
  if (n.includes('lambda')) return 'λ';
  if (n.includes('s3')) return '🪣';
  if (n.includes('dynamodb')) return '🗃';
  if (n.includes('ecs')) return '🐳';
  if (n.includes('elasticache')) return '⚡';
  if (n.includes('sqs')) return '📬';
  if (n.includes('opensearch')) return '🔍';
  if (n.includes('cloudfront')) return '🌐';
  if (n.includes('api gateway') && n.includes('websocket')) return '🔌';
  if (n.includes('api gateway')) return '⚙️';
  if (n.includes('waf')) return '🧱';
  if (n.includes('cloudwatch')) return '📊';
  if (n.includes('route 53') || n.includes('route53')) return '🗺️';
  if (n.includes('secrets manager')) return '🔑';
  if (n.includes('redshift')) return '📈';
  if (n.includes('athena')) return '📋';
  if (n.includes('sns')) return '📢';
  if (n.includes('kinesis')) return '🌊';
  if (n.includes('ec2')) return '🖥️';
  return '☁️';
}

export function parseCostNum(str) {
  if (!str) return 0;
  const m = (str.match(/[\d,]+/) || [])[0];
  return m ? parseInt(m.replace(/,/g, '')) : 0;
}

export function getServiceDescription(name) {
  if (!name) return 'AWS Cloud Service';
  const n = name.toLowerCase();
  if (n.includes('cognito')) return 'Fully managed identity service for securely managing authentication, authorization, and user scaling.';
  if (n.includes('lambda')) return 'Serverless compute service that runs code in response to events and automatically manages the underlying compute resources.';
  if (n.includes('s3')) return 'Object storage built to store and retrieve any amount of data from anywhere with 99.999999999% durability.';
  if (n.includes('dynamodb')) return 'Fully managed, serverless, key-value NoSQL database designed to run high-performance applications at any scale.';
  if (n.includes('ecs')) return 'Fully managed container orchestration service offering reliable and scalable deployment for containerized applications.';
  if (n.includes('elasticache')) return 'Fully managed, in-memory caching service compatible with Redis or Memcached to deliver sub-millisecond latency.';
  if (n.includes('sqs')) return 'Fully managed message queuing for microservices, distributed systems, and serverless applications.';
  if (n.includes('opensearch')) return 'Distributed, community-driven search and analytics suite used for real-time application monitoring and log analytics.';
  if (n.includes('cloudfront')) return 'Global content delivery network (CDN) service built for high-speed, secure, and programmable data distribution.';
  if (n.includes('api gateway') && n.includes('websocket')) return 'Managed service enabling real-time, two-way communication mappings for interactive web and mobile apps.';
  if (n.includes('api gateway')) return 'Fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs at any scale.';
  if (n.includes('waf')) return 'Web Application Firewall that helps protect web applications or APIs against common web exploits and bots.';
  if (n.includes('cloudwatch')) return 'Observation and management service providing data and actionable insights to monitor applications and respond to system-wide performance changes.';
  if (n.includes('route 53') || n.includes('route53')) return 'Highly available and scalable cloud Domain Name System (DNS) web service.';
  if (n.includes('secrets manager')) return 'Helps you seamlessly manage, retrieve, and rotate database credentials, API keys, and other secrets.';
  if (n.includes('redshift')) return 'Fast, simple, cost-effective data warehousing service used for analyzing all data using standard SQL.';
  if (n.includes('athena')) return 'Serverless interactive query service that makes it easy to analyze data in Amazon S3 using standard SQL.';
  if (n.includes('sns')) return 'Fully managed messaging and notification service for both A2A (Application-to-Application) and A2P (Application-to-Person) communication.';
  if (n.includes('kinesis')) return 'Platform for streaming data on AWS, offering services to easily load and analyze streaming data.';
  if (n.includes('ec2')) return 'Secure and resizable compute capacity in the cloud, allowing robust virtualization setups.';
  if (n.includes('fargate')) return 'Serverless compute engine for containers that works with both Amazon ECS and Amazon EKS.';
  if (n.includes('ebs')) return 'Block-level storage volumes for use with Amazon EC2 instances for persistent and dedicated storage.';
  if (n.includes('efs')) return 'Serverless, fully elastic file storage allowing shared access across thousands of EC2 instances.';
  if (n.includes('rds')) return 'Managed relational database service providing easy to set up, operate, and scale relational databases in the cloud.';
  if (n.includes('neptune')) return 'Fast, reliable, fully managed graph database service that makes it easy to build and run applications that work with highly connected datasets.';
  if (n.includes('elb')) return 'Elastic Load Balancing automatically distributes incoming application traffic across multiple targets.';
  if (n.includes('iam')) return 'Enables you to manage access to AWS services and resources securely.';
  if (n.includes('eventbridge')) return 'Serverless event bus that makes it easier to build event-driven applications at scale using events generated from your applications.';
  return 'Foundational AWS cloud component ensuring smooth operation within the generated architecture topology.';
}
