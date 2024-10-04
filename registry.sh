aws_account_id="586794483534"
aws_region="eu-central-1"
domain_name="akord"
repository_name="akord"

# Step 1: Configure CodeArtifact
echo "Configuring AWS CLI with CodeArtifact..."
aws configure set default.region ${aws_region}

# Step 2: Retrieve authentication token from CodeArtifact
echo "Retrieving authentication token from CodeArtifact..."
token=$(aws codeartifact get-authorization-token --domain ${domain_name} --domain-owner $(aws sts get-caller-identity --query Account --output text) --query authorizationToken --output text)
echo $token

# Step 3: Create project-specific .npmrc file
echo "Creating .npmrc file..."
cat > .npmrc <<EOF
registry=https://${domain_name}-${aws_account_id}.d.codeartifact.${aws_region}.amazonaws.com/npm/${repository_name}/
//${domain_name}-${aws_account_id}.d.codeartifact.${aws_region}.amazonaws.com/npm/${repository_name}/:always-auth=true
//${domain_name}-${aws_account_id}.d.codeartifact.${aws_region}.amazonaws.com/npm/${repository_name}/:_authToken=${token}
EOF

echo "Successfully created .npmrc file for ${domain_name}/${repository_name}."
