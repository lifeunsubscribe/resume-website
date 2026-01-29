#!/usr/bin/env python3
"""
Generate architecture diagrams for the "2 Buckets 1 Website" blog post.

Usage:
    pip install diagrams
    python generate_blog_diagrams.py

Output:
    ../resume-website-files/blog/2-buckets-1-website/images/
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.network import CloudFront, Route53
from diagrams.aws.storage import S3
from diagrams.aws.compute import LambdaFunction
from diagrams.aws.security import ACM
from diagrams.onprem.client import Users
import os

# Output directory
OUTPUT_DIR = "../resume-website-files/blog/2-buckets-1-website/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Common graph attributes for cleaner diagrams
graph_attr = {
    "fontsize": "12",
    "bgcolor": "white",
    "pad": "0.5",
    "splines": "ortho",  # Orthogonal edges (no curves through nodes)
    "nodesep": "1.0",    # More space between nodes
    "ranksep": "1.0",    # More space between ranks
}

# Diagram 1: S3-Only Approach (The Old Way)
# This one is simpler, keep as-is but with cleaner layout
with Diagram(
    "S3-Only Redirect Pattern",
    filename=f"{OUTPUT_DIR}/s3-only-approach",
    show=False,
    direction="LR",
    graph_attr=graph_attr,
):
    users = Users("Users")

    with Cluster("AWS"):
        route53 = Route53("Route53")
        redirect_bucket = S3("example.com\n(redirect)")
        content_bucket = S3("www.example.com\n(content)")

    users >> route53 >> redirect_bucket >> Edge(label="301") >> content_bucket


# Diagram 2: CloudFront Without Redirect (The Broken Way)
with Diagram(
    "CloudFront Without Redirect",
    filename=f"{OUTPUT_DIR}/cloudfront-no-redirect",
    show=False,
    direction="LR",
    graph_attr={
        **graph_attr,
        "splines": "polyline",
    },
):
    users = Users("Users")

    with Cluster("AWS"):
        route53 = Route53("Route53")
        cloudfront = CloudFront("CloudFront")
        content_bucket = S3("www.example.com\n(content)")

        # Zombie bucket - visually separated
        with Cluster("Unused"):
            zombie_bucket = S3("example.com\n🧟 zombie")

    users >> route53 >> cloudfront >> content_bucket
    # No connection to zombie bucket - that's the point


# Diagram 3: CloudFront Function Approach (The Modern Way)
# FIX: Avoid arrows through text by using different layout
with Diagram(
    "CloudFront Function Redirect",
    filename=f"{OUTPUT_DIR}/cloudfront-function-approach",
    show=False,
    direction="LR",
    graph_attr={
        **graph_attr,
        "splines": "polyline",  # Straight lines with corners
        "nodesep": "1.2",
        "ranksep": "1.5",
    },
):
    users = Users("Users")

    with Cluster("AWS"):
        route53 = Route53("Route53")

        with Cluster("CloudFront Distribution"):
            cf_function = LambdaFunction("Redirect\nFunction")
            cloudfront = CloudFront("CDN")

        content_bucket = S3("S3 Bucket\n(private)")

    # Simplified flow - users to Route53
    users >> route53

    # Route53 to CloudFront Function
    route53 >> cf_function

    # Function to CDN (www requests pass through)
    cf_function >> cloudfront

    # CDN to bucket with OAC label
    cloudfront >> Edge(label="OAC") >> content_bucket


# Diagram 4: Complete Modern Architecture
# FIX: Make it horizontal (LR) instead of vertical (TB)
with Diagram(
    "Modern Static Site Architecture",
    filename=f"{OUTPUT_DIR}/full-modern-architecture",
    show=False,
    direction="LR",  # CHANGED from TB to LR
    graph_attr={
        **graph_attr,
        "splines": "ortho",
        "nodesep": "0.8",
        "ranksep": "1.2",
    },
):
    users = Users("Users")

    with Cluster("AWS Cloud"):
        # DNS & Certificate
        route53 = Route53("Route53")
        acm = ACM("ACM\nCertificate")

        with Cluster("CloudFront"):
            cf_function = LambdaFunction("www Redirect")
            cloudfront = CloudFront("CDN + OAC\n+ Headers")

        # Origin
        content_bucket = S3("S3\n(Private)")

    # Flow
    users >> route53 >> cf_function >> cloudfront >> content_bucket
    acm >> cloudfront


# Diagram 5: Option 1 - Two Buckets + Two CloudFront Distributions (Legacy Pattern)
with Diagram(
    "Two Buckets + Two CloudFront Distributions",
    filename=f"{OUTPUT_DIR}/two-buckets-two-distributions",
    show=False,
    direction="LR",
    graph_attr={
        "fontsize": "12",
        "bgcolor": "white",
        "pad": "0.5",
        "splines": "polyline",
        "nodesep": "0.8",
        "ranksep": "1.0",
    },
):
    users = Users("Users")

    with Cluster("AWS"):
        route53 = Route53("Route53")

        with Cluster("Redirect Flow"):
            cf_redirect = CloudFront("CF #1\n(redirect)")
            s3_redirect = S3("example.com")

        with Cluster("Content Flow"):
            cf_content = CloudFront("CF #2\n(content)")
            s3_content = S3("www.example.com")

    # Main flow
    users >> route53
    route53 >> cf_redirect >> s3_redirect
    s3_redirect >> Edge(label="301", style="dashed") >> cf_content
    cf_content >> s3_content


print(f"✅ Diagrams regenerated in {OUTPUT_DIR}/")
print("   - s3-only-approach.png")
print("   - cloudfront-no-redirect.png")
print("   - cloudfront-function-approach.png")
print("   - full-modern-architecture.png")
print("   - two-buckets-two-distributions.png")
