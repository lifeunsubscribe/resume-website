#!/usr/bin/env python3
"""
Generate AWS architecture diagrams for portfolio website.
Run: python generate_diagrams.py
Output: PNG files in ./output/
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.network import Route53, CloudFront
from diagrams.aws.storage import S3
from diagrams.aws.security import CertificateManager, IAMRole
from diagrams.aws.general import Users
from diagrams.onprem.vcs import Github
from diagrams.onprem.ci import GithubActions


# Diagram 1: Website Hosting Architecture
def create_hosting_diagram():
    with Diagram(
        "Portfolio Website Architecture",
        filename="output/portfolio-hosting-architecture",
        show=False,
        direction="LR",  # Left to right
        graph_attr={
            "fontsize": "24",
            "bgcolor": "white",
            "pad": "0.5",
        },
    ):
        users = Users("Users")

        with Cluster("AWS Cloud"):
            route53 = Route53("Route53\nDNS")
            acm = CertificateManager("ACM\nSSL/TLS Cert")

            with Cluster("Edge"):
                cloudfront = CloudFront("CloudFront\nCDN + OAC")

            with Cluster("Origin"):
                s3 = S3("S3 Bucket\n(Private)")

        # Flow
        users >> Edge(label="HTTPS") >> route53
        route53 >> cloudfront
        acm >> Edge(label="TLS", style="dashed") >> cloudfront
        cloudfront >> Edge(label="SigV4 Signed") >> s3


# Diagram 2: CI/CD Pipeline
def create_cicd_diagram():
    with Diagram(
        "CI/CD Pipeline",
        filename="output/portfolio-cicd-pipeline",
        show=False,
        direction="LR",
        graph_attr={
            "fontsize": "24",
            "bgcolor": "white",
            "pad": "0.5",
        },
    ):
        dev = Users("Developer")

        with Cluster("GitHub"):
            github = Github("Repository")
            actions = GithubActions("Actions\nWorkflow")

        with Cluster("AWS Cloud"):
            oidc = IAMRole("OIDC Provider\n+ IAM Role")
            s3 = S3("S3 Bucket")
            cloudfront = CloudFront("CloudFront")

        # Flow
        dev >> Edge(label="git push") >> github
        github >> Edge(label="trigger") >> actions
        actions >> Edge(label="OIDC Auth\n(no secrets)") >> oidc
        oidc >> Edge(label="sync files") >> s3
        oidc >> Edge(label="invalidate cache", style="dashed") >> cloudfront


# Diagram 3: Security Model
def create_security_diagram():
    with Diagram(
        "Zero-Trust Security Model",
        filename="output/portfolio-security-model",
        show=False,
        direction="TB",  # Top to bottom
        graph_attr={
            "fontsize": "24",
            "bgcolor": "white",
            "pad": "0.5",
        },
    ):
        with Cluster("Public Internet"):
            users = Users("Users")

        with Cluster("AWS Edge"):
            cloudfront = CloudFront("CloudFront\n+ Response Headers Policy")
            acm = CertificateManager("ACM Certificate")

        with Cluster("AWS Origin (Private)"):
            s3 = S3("S3 Bucket\nBlock Public Access: ON")

        with Cluster("Access Control"):
            oac = IAMRole("Origin Access Control\n(OAC)")

        users >> Edge(label="HTTPS Only") >> cloudfront
        acm >> cloudfront
        cloudfront >> oac
        oac >> Edge(label="SigV4 Signed Requests") >> s3


if __name__ == "__main__":
    print("Generating diagrams...")
    create_hosting_diagram()
    print("✓ Created portfolio-hosting-architecture.png")
    create_cicd_diagram()
    print("✓ Created portfolio-cicd-pipeline.png")
    create_security_diagram()
    print("✓ Created portfolio-security-model.png")
    print("\nDone! Check the ./output/ directory.")
