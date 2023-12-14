import React from 'react'
import { Typography } from '@material-ui/core';
import { InfoCard } from '@backstage/core-components';
import { useEntity } from '@backstage/plugin-catalog-react'
import { configApiRef, useApi } from '@backstage/core-plugin-api';

export const DemoEntityCard = () => {
  const {entity} = useEntity()
  const configApi = useApi(configApiRef);
  const foo = configApi.getOptionalString('testPlugin.foo');
  return (
    <InfoCard title="Entity name">
      <Typography variant="body1">
        {entity.kind}:{entity.metadata.namespace || "default"}/{entity.metadata.name}
        <br/>
        Config value: {foo || "not set"}
      </Typography>
    </InfoCard>
  )
}
