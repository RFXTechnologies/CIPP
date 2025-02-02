import React, { useState } from 'react'
import { CButton, CCallout, CCol, CForm, CRow, CSpinner, CTooltip } from '@coreui/react'
import { useSelector } from 'react-redux'
import { Field, Form, FormSpy } from 'react-final-form'
import {
  Condition,
  RFFCFormInput,
  RFFCFormRadioList,
  RFFCFormSwitch,
  RFFSelectSearch,
  RFFCFormSelect,
} from 'src/components/forms'
import {
  useGenericGetRequestQuery,
  useLazyGenericGetRequestQuery,
  useLazyGenericPostRequestQuery,
} from 'src/store/api/app'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleNotch, faEdit, faEye } from '@fortawesome/free-solid-svg-icons'
import { CippContentCard, CippPage, CippPageList } from 'src/components/layout'
import { CellTip, cellGenericFormatter } from 'src/components/tables/CellGenericFormat'
import 'react-datepicker/dist/react-datepicker.css'
import { TenantSelector } from 'src/components/utilities'
import arrayMutators from 'final-form-arrays'
import DatePicker from 'react-datepicker'
import { useListUsersQuery } from 'src/store/api/users'
import GDAPRoles from 'src/data/GDAPRoles'
import { CippDatatable, cellDateFormatter } from 'src/components/tables'
import { useListDomainsQuery } from 'src/store/api/domains'

const DeployJITAdmin = () => {
  const [ExecuteGetRequest, getResults] = useLazyGenericGetRequestQuery()
  const currentDate = new Date()
  const [startDate, setStartDate] = useState(currentDate)
  const [endDate, setEndDate] = useState(currentDate)

  const tenantDomain = useSelector((state) => state.app.currentTenant.defaultDomainName)
  const [refreshState, setRefreshState] = useState(false)
  const [genericPostRequest, postResults] = useLazyGenericPostRequestQuery()
  const {
    data: domains = [],
    isFetching: domainsIsFetching,
    error: domainsError,
  } = useListDomainsQuery({ tenantDomain })

  const onSubmit = (values) => {
    const startTime = Math.floor(startDate.getTime() / 1000)
    const endTime = Math.floor(endDate.getTime() / 1000)
    const shippedValues = {
      TenantFilter: tenantDomain,
      UserId: values.UserId?.value,
      UserPrincipalName: `${values.username}@${values.domain}`,
      FirstName: values.FirstName,
      LastName: values.LastName,
      useraction: values.useraction,
      AdminRoles: values.AdminRoles?.map((role) => role.value),
      StartDate: startTime,
      UseTAP: values.useTap,
      EndDate: endTime,
      ExpireAction: values.expireAction.value,
      PostExecution: {
        Webhook: values.webhook,
        Email: values.email,
        PSA: values.psa,
      },
    }
    genericPostRequest({ path: '/api/ExecJITAdmin', values: shippedValues }).then((res) => {
      setRefreshState(res.requestId)
    })
  }

  const {
    data: users = [],
    isFetching: usersIsFetching,
    error: usersError,
  } = useGenericGetRequestQuery({
    path: '/api/ListGraphRequest',
    params: {
      TenantFilter: tenantDomain,
      Endpoint: 'users',
      $select: 'id,displayName,userPrincipalName,accountEnabled',
      $count: true,
      $top: 999,
      $orderby: 'displayName',
    },
  })

  return (
    <CippPage title={`Add JIT Admin`} tenantSelector={false}>
      <>
        <CRow className="mb-3">
          <CCol lg={4} md={12}>
            <CippContentCard title="Add JIT Admin" icon={faEdit}>
              <Form
                onSubmit={onSubmit}
                mutators={{
                  ...arrayMutators,
                }}
                render={({ handleSubmit, submitting, values }) => {
                  return (
                    <CForm onSubmit={handleSubmit}>
                      <p>
                        JIT Admin creates an account that is usable for a specific period of time.
                        Enter a username, select admin roles, date range and expiration action.
                      </p>
                      <CRow className="mb-3">
                        <CCol>
                          <label className="mb-2">Tenant</label>
                          <Field name="tenantFilter">
                            {(props) => <TenantSelector showAllTenantSelector={false} />}
                          </Field>
                        </CCol>
                      </CRow>
                      <CRow>
                        <hr />
                      </CRow>
                      <CRow className="mb-3">
                        <CCol>
                          <RFFCFormRadioList
                            name="useraction"
                            options={[
                              { value: 'create', label: 'New User' },
                              { value: 'select', label: 'Existing User' },
                            ]}
                            validate={false}
                            inline={true}
                            className=""
                          />
                        </CCol>
                      </CRow>
                      <Condition when="useraction" is="create">
                        <CRow>
                          <CCol>
                            <RFFCFormInput label="First Name" name="FirstName" />
                          </CCol>
                        </CRow>
                        <CRow>
                          <CCol>
                            <RFFCFormInput label="Last Name" name="LastName" />
                          </CCol>
                        </CRow>
                        <CRow>
                          <CCol md={6}>
                            <RFFCFormInput type="text" name="username" label="Username" />
                          </CCol>
                          <CCol>
                            {domainsIsFetching && <CSpinner />}
                            {!domainsIsFetching && (
                              <RFFCFormSelect
                                name="domain"
                                label="Domain"
                                defaultValue={tenantDomain}
                                placeholder={!domainsIsFetching ? 'Select domain' : 'Loading...'}
                                values={domains?.map((domain) => ({
                                  value: domain.id,
                                  label: domain.id,
                                }))}
                              />
                            )}
                            {domainsError && <span>Failed to load list of domains</span>}
                          </CCol>
                        </CRow>
                      </Condition>
                      <Condition when="useraction" is="select">
                        <CRow className="mb-3">
                          <CCol>
                            <RFFSelectSearch
                              label={'Users in ' + tenantDomain}
                              values={users?.Results?.map((user) => ({
                                value: user.id,
                                name: `${user.displayName} <${user.userPrincipalName}>`,
                              }))}
                              placeholder={!usersIsFetching ? 'Select user' : 'Loading...'}
                              name="UserId"
                              isLoading={usersIsFetching}
                            />
                            <FormSpy subscription={{ values: true }}>
                              {({ values }) => {
                                return users?.Results?.map((user, key) => {
                                  if (
                                    user.id === values?.UserId?.value &&
                                    user.accountEnabled === false
                                  ) {
                                    return (
                                      <CCallout color="warning" key={key} className="mt-3">
                                        This user is currently disabled, they will automatically be
                                        enabled when JIT is executed.
                                      </CCallout>
                                    )
                                  }
                                })
                              }}
                            </FormSpy>
                          </CCol>
                        </CRow>
                      </Condition>
                      <hr />
                      <CRow className="mb-3">
                        <CCol>
                          <RFFSelectSearch
                            label="Administrative Roles"
                            values={GDAPRoles?.map((role) => ({
                              value: role.ObjectId,
                              name: role.Name,
                            }))}
                            multi={true}
                            placeholder="Select Roles"
                            name="AdminRoles"
                          />
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol>
                          <label>Scheduled Start Date</label>
                          <DatePicker
                            className="form-control"
                            selected={startDate}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="Pp"
                            onChange={(date) => setStartDate(date)}
                          />
                        </CCol>
                        <CCol>
                          <label>Scheduled End Date</label>
                          <DatePicker
                            className="form-control"
                            selected={endDate}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="Pp"
                            onChange={(date) => setEndDate(date)}
                          />
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol>
                          <RFFSelectSearch
                            label="Expiration Action"
                            values={[
                              { value: 'RemoveRoles', name: 'Remove Admin Roles' },
                              { value: 'DisableUser', name: 'Disable User' },
                              { value: 'DeleteUser', name: 'Delete User' },
                            ]}
                            placeholder="Select action for when JIT expires"
                            name="expireAction"
                          />
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol>
                          <CTooltip content="Generate a Temporary Access Password for the JIT Admin account if enabled for the tenant. This applies to both New and Existing users. The start time coincides with the scheduled time.">
                            <div>
                              <RFFCFormSwitch name="useTap" label="Generate TAP" />
                            </div>
                          </CTooltip>
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol>
                          <label>Send results to</label>
                          <RFFCFormSwitch name="webhook" label="Webhook" />
                          <RFFCFormSwitch name="email" label="E-mail" />
                          <RFFCFormSwitch name="psa" label="PSA" />
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <CButton type="submit" disabled={submitting}>
                            Add JIT Admin
                            {postResults.isFetching && (
                              <FontAwesomeIcon
                                icon={faCircleNotch}
                                spin
                                className="ms-2"
                                size="1x"
                              />
                            )}
                          </CButton>
                        </CCol>
                      </CRow>
                      {postResults.isSuccess && (
                        <CCallout color="success">
                          {postResults.data?.Results.map((result, idx) => (
                            <li key={idx}>{result}</li>
                          ))}
                        </CCallout>
                      )}
                      {getResults.isFetching && (
                        <CCallout color="info">
                          <CSpinner>Loading</CSpinner>
                        </CCallout>
                      )}
                      {getResults.isSuccess && (
                        <CCallout color="info">{getResults.data?.Results}</CCallout>
                      )}
                      {getResults.isError && (
                        <CCallout color="danger">
                          Could not connect to API: {getResults.error.message}
                        </CCallout>
                      )}
                    </CForm>
                  )
                }}
              />
            </CippContentCard>
          </CCol>
          <CCol lg={8} md={12}>
            <CippContentCard title="JIT Admins" icon="user-shield">
              <CippDatatable
                title="JIT Admins"
                path="/api/ExecJITAdmin?Action=List"
                params={{ TenantFilter: tenantDomain, refreshState }}
                columns={[
                  {
                    name: 'User',
                    selector: (row) => row['userPrincipalName'],
                    sortable: true,
                    cell: cellGenericFormatter(),
                    exportSelector: 'userPrincipalName',
                  },
                  {
                    name: 'Account Enabled',
                    selector: (row) => row['accountEnabled'],
                    sortable: true,
                    cell: cellGenericFormatter(),
                    exportSelector: 'accountEnabled',
                  },
                  {
                    name: 'JIT Enabled',
                    selector: (row) => row['jitAdminEnabled'],
                    sortable: true,
                    cell: cellGenericFormatter(),
                    exportSelector: 'jitAdminEnabled',
                  },
                  {
                    name: 'JIT Expires',
                    selector: (row) => row['jitAdminExpiration'],
                    sortable: true,
                    cell: cellDateFormatter({ format: 'short' }),
                    exportSelector: 'jitAdminExpiration',
                  },
                  {
                    name: 'Admin Roles',
                    selector: (row) => row['memberOf'],
                    sortable: false,
                    cell: cellGenericFormatter(),
                    exportSelector: 'memberOf',
                  },
                ]}
              />
            </CippContentCard>
          </CCol>
        </CRow>
      </>
    </CippPage>
  )
}

export default DeployJITAdmin
